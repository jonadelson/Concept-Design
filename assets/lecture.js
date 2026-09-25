// Shared behavior for every lecture page:
//  - renders each slide live from MIT's PDF (nothing is copied into this repo)
//  - per-slide notes saved in this browser, plus "copy for chat"
//  - tap a slide to see it full screen
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

const body = document.body;
const LECTURE = body.dataset.lecture;
const PDF_URL = body.dataset.pdf;
const TITLE = document.querySelector("h1")?.textContent.trim() ?? LECTURE;
const slides = [...document.querySelectorAll(".slide[data-page]")];

// ---------- storage (never throws) ----------
const store = {
  get(k) { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } },
  set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} },
};
const noteKey = (id) => `cd-notes:${LECTURE}:${id}`;

// ---------- build the per-slide chrome ----------
for (const el of slides) {
  const n = el.dataset.page;
  const label = document.createElement("p");
  label.className = "slide-label";
  label.innerHTML = `<span>Slide ${n}</span><a href="${PDF_URL}#page=${n}" target="_blank" rel="noopener">open original ↗</a>`;
  const frame = document.createElement("figure");
  frame.className = "frame";
  frame.innerHTML = `<div class="ph">Loading slide ${n}…</div>`;
  frame.addEventListener("click", () => openLightbox(+n));
  el.prepend(label, frame);
  el.id ||= `s${n}`;
  el.append(makeNote(n, el.dataset.title || `Slide ${n}`));
}
const general = document.querySelector("#general-note");
if (general) general.append(makeNote("general", "General thoughts", true));

function makeNote(id, title, open = false) {
  const wrap = document.createElement("div");
  wrap.className = "note";
  const btn = document.createElement("button");
  btn.className = "note-toggle";
  const ta = document.createElement("textarea");
  ta.placeholder = id === "general"
    ? "Big-picture reactions, questions for Claude, things to look up…"
    : "Your note on this slide…";
  ta.value = store.get(noteKey(id));
  ta.dataset.id = id;
  ta.dataset.title = title;
  const sync = () => {
    btn.textContent = ta.value.trim() ? "📝 Your note" : "＋ Add a note";
    btn.classList.toggle("has", !!ta.value.trim());
  };
  const shown = open || !!ta.value.trim();
  ta.hidden = !shown;
  btn.hidden = open;
  btn.addEventListener("click", () => {
    ta.hidden = !ta.hidden;
    if (!ta.hidden) ta.focus();
  });
  ta.addEventListener("input", () => {
    store.set(noteKey(id), ta.value);
    sync();
    updateBar();
  });
  sync();
  wrap.append(btn, ta);
  return wrap;
}

// ---------- notes bar ----------
const bar = document.createElement("div");
bar.className = "notesbar";
bar.innerHTML = `<div class="wrap"><span class="count"></span>
  <button class="btn" data-act="copy">Copy notes for chat</button></div>`;
document.body.append(bar);
const toast = Object.assign(document.createElement("div"), { className: "toast" });
document.body.append(toast);

function allNotes() {
  return [...document.querySelectorAll(".note textarea")].filter((t) => t.value.trim());
}
function updateBar() {
  const n = allNotes().length;
  bar.querySelector(".count").textContent =
    n ? `${n} note${n > 1 ? "s" : ""} on this lecture` : "No notes yet";
  bar.querySelector("[data-act=copy]").disabled = !n;
}
updateBar();

bar.querySelector("[data-act=copy]").addEventListener("click", async () => {
  const lines = [`## My notes: ${TITLE}`, `${location.href.split("#")[0]}`, ""];
  for (const t of allNotes()) {
    const where = t.dataset.id === "general" ? "General" : `Slide ${t.dataset.id} (${t.dataset.title})`;
    lines.push(`**${where}**`, t.value.trim(), "");
  }
  const text = lines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const tmp = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(tmp); tmp.select(); document.execCommand("copy"); tmp.remove();
  }
  showToast("Copied. Paste it into your chat with Claude");
});
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// ---------- PDF rendering ----------
const progress = document.querySelector(".progress");
const task = pdfjsLib.getDocument({ url: PDF_URL });
task.onProgress = ({ loaded, total }) => {
  if (progress && total) progress.style.width = `${Math.min(100, (loaded / total) * 100)}%`;
};
let pdf;
try {
  pdf = await task.promise;
  if (progress) { progress.style.width = "100%"; setTimeout(() => (progress.style.opacity = 0), 400); }
} catch (err) {
  console.error(err);
  for (const el of slides) {
    const n = el.dataset.page;
    el.querySelector(".ph").innerHTML =
      `Couldn't load the slides from MIT.<br><a href="${PDF_URL}#page=${n}" target="_blank" rel="noopener">Open slide ${n} in the PDF ↗</a>`;
  }
}

async function renderInto(canvas, pageNo, cssWidth) {
  const page = await pdf.getPage(pageNo);
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const scale = Math.min((cssWidth * dpr) / base.width, 2);
  const vp = page.getViewport({ scale });
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
}

const rendered = new Map(); // page -> css width rendered at
async function renderSlide(el) {
  const n = +el.dataset.page;
  const frame = el.querySelector(".frame");
  const w = frame.clientWidth;
  if (rendered.get(n) >= w * 0.9) return;
  rendered.set(n, w);
  let canvas = frame.querySelector("canvas");
  if (!canvas) { canvas = document.createElement("canvas"); frame.prepend(canvas); }
  canvas.setAttribute("aria-label", `Slide ${n}: ${el.dataset.title || ""}`);
  try {
    await renderInto(canvas, n, w);
    frame.classList.add("ready");
  } catch (e) {
    console.error(e);
    rendered.delete(n);
  }
}

if (pdf) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && renderSlide(e.target)),
    { rootMargin: "1200px 0px" }
  );
  slides.forEach((el) => io.observe(el));
  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => slides.forEach((el) => rendered.has(+el.dataset.page) && renderSlide(el)), 300);
  });
}

// ---------- lightbox ----------
const lb = Object.assign(document.createElement("div"), { className: "lightbox" });
lb.innerHTML = "<canvas></canvas>";
lb.addEventListener("click", () => lb.classList.remove("open"));
addEventListener("keydown", (e) => e.key === "Escape" && lb.classList.remove("open"));
document.body.append(lb);
async function openLightbox(n) {
  if (!pdf) return;
  lb.classList.add("open");
  await renderInto(lb.querySelector("canvas"), n, Math.max(innerWidth, innerHeight));
}
