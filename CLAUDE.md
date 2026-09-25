# Concept Design companion site

A personal GitHub Pages site for following MIT 6.1040 Software Design (Fall 2026, https://61040.github.io/fa26/) as a listener. The owner is a professional software engineer, reads mostly on phone/tablet, and asks for new lectures on demand.

## Layout
- `index.html`: course home. The `SCHEDULE` array controls the list; set `status: "ready"` and `href` when a page ships.
- `lectures/<slug>.html`: one page per lecture (recitations go in `recitations/`, assignments in `assignments/`).
- `assets/lecture.js`: renders slides live from MIT's PDF with PDF.js (the course site sends `Access-Control-Allow-Origin: *`), plus per-slide notes in localStorage, "copy notes for chat", and a lightbox.
- `assets/style.css`: all styling, with light and dark tokens.

## Building a lecture page
1. Find the PDF link on https://61040.github.io/fa26/schedule/ and download it to the scratchpad. Extract text with PyMuPDF (`pip install pymupdf`) and render a contact sheet to *look at* the slides.
2. Copy `lectures/welcome.html` as the template. Set `data-lecture` (slug) and `data-pdf` (absolute MIT URL) on `<body>`.
3. Write one `<article class="slide" data-page="N" data-title="...">` per slide, containing `.narration` and optional `<details class="aside" data-kind="source|industry|debate|you">` margin notes.
4. End with 4–6 self-check questions and the `#general-note` block, and update prev/next links and `index.html`.
5. Never copy slide images into the repo. Slides are MIT's copyrighted material and are only embedded live.

## Voice and honesty rules
- Narration is in the lecturer's voice but is a reconstruction; the page says so. For photo-only slides, use a `<p class="stage">` description and don't invent speech.
- Don't state facts you can't verify. Hedge attributions you're unsure of explicitly (see the Dohmke source note in welcome.html).
- The class guide warns that LLM prose is recognizable: everything in threes, uniform rhythm, saying more than it means. Write plainly, vary sentence length, avoid triplets and slogans.
- Never write the owner's personal reflections (E1 goals, etc.). Respond to what they write instead.
- The owner pastes notes into chat as markdown. If asked, save them to `notes/<slug>.md`.
