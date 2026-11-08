# Offline Resume Builder

A browser application for writing a professional resume on your own device. It does not use an account, a backend, or an external API.

[![Status](https://img.shields.io/badge/status-work%20in%20progress-orange)](https://img.shields.io/badge/status-work%20in%20progress-orange)
[![HTML5](https://img.shields.io/badge/HTML5-semantic-E34F26)](https://img.shields.io/badge/HTML5-semantic-E34F26)
[![CSS3](https://img.shields.io/badge/CSS3-no%20framework-1572B6)](https://img.shields.io/badge/CSS3-no%20framework-1572B6)
[![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E)](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E)

**BSERC GenAI Internship — Week 2, Project 3**

The interface is in place and a sample resume renders in a Classic A4 preview. Editing, extra templates, file import and export, local autosave, and multi-page layout are still ahead.

## Overview

Job applications often push people through hosted resume builders that require an account and upload the document to someone else's server. This project is a local alternative: open one HTML file, review a resume, and print it from the browser.

The current build loads a complete fictional sample and shows it beside a read-only document outline. Resume data lives in memory for that visit. Nothing is uploaded, and the page does not call a remote service.

It is aimed at students and early-career candidates who want a private draft, and at reviewers who need to see a small client-side application with a clear data model and a separate print stylesheet.

## Screenshots

No screenshots are stored in this repository yet. These filenames are reserved for later captures. They are not linked, so the page does not show broken images.

```text
assets/screenshots/phase-1-preview.png
assets/screenshots/editor-preview.png
assets/screenshots/templates-preview.png
assets/screenshots/pdf-preview.png
```

## Features

### Implemented

- Static application shell that opens from `index.html` with no build step and no network requirement.
- In-memory resume document, with subscribers that redraw the outline and the preview.
- Ten section types in the data model: personal information, summary, education, skills, experience, projects, certifications, achievements, positions of responsibility, and additional information.
- A fictional sample resume that fills every section.
- Read-only document outline. It is not an edit form.
- Live Classic A4 preview. The preview element is fixed at 210mm by at least 297mm, and text is real DOM text.
- Overview card bound to application state: selected template name, count of sections that contain text, page count estimated from the preview height, and the fixed status "Not saved on this device".
- Navigation between Resume Editor, Templates, Preview, and Settings.
- Template cards. Classic can be selected. Modern and Creative are disabled.
- Export PDF buttons that call `window.print()`. Print CSS hides the dark interface and prints the white resume page.
- Responsive shell: a side-by-side workspace on a wide window, and a stacked layout below 980px. On a narrow window the A4 page scrolls inside the preview pane.
- Reduced-motion support for the background glow and view transitions.

The state module can already update fields, add and remove entries, rename and move sections, replace the document, and reject an unknown template. Those operations are not connected to form controls yet.

### Planned

- A form for adding, editing, and deleting entries.
- Modern and Creative templates that change the preview, not only the stored template name.
- Drag-and-drop section reordering, with up and down controls.
- JSON download and validated JSON import.
- Automatic `localStorage` persistence.
- Pagination that splits the resume into A4 pages before print, so the preview and the PDF use the same breaks.
- Scaling the A4 preview to the pane width on small screens.

Basic printing works today. Accurate multi-page PDF layout does not.

## Design

The application chrome uses a midnight navy field (`#071329`), a vertical pinstripe texture, a coral glow (`#FF695F`) with a cooler blue light, translucent glass panels, and a floating pill navigation. Type is set with system fonts: a sans-serif for the interface and Georgia for the resume.

That theme stops at the page edge. The resume is a white, single-column Classic document. Print rules set the page background to white and remove the navigation, hero, editor, and feature strip.

## Technology

| Technology | Role in this repository |
| --- | --- |
| HTML5 | Semantic page structure in `index.html` |
| CSS3 | Interface theme, A4 page, Classic template, print rules |
| Vanilla JavaScript | Classic scripts, no bundler and no framework |
| DOM APIs | Outline and preview built with `createElement` and `textContent` |
| `window.print()` | PDF path through the browser print dialog |
| `crypto.randomUUID()` | Identifiers for sections and entries created in code |
| `matchMedia` | `prefers-reduced-motion` |

`localStorage`, `fetch`, and `FileReader` are not used. There is no package manifest and no build command.

## Architecture

One resume object is the source of truth. `main.js` creates it from the sample, then the outline renderer and the resume renderer subscribe to it. `shell.js` reads the same object for the overview card and switches views. User text is written with DOM text nodes.

```text
resume-builder/
├── index.html
├── css/
│   ├── editor.css                 Interface, layout, and print hiding
│   ├── resume.css                 A4 page, resume type, and print page size
│   └── templates/
│       ├── classic.css            Classic heading and alignment rules
│       ├── modern.css             Reserved
│       └── creative.css           Reserved
└── js/
    ├── schema.js                  Section catalog, factories, template ids
    ├── sample.js                  Demonstration resume
    ├── validate.js                Reserved for import checks
    ├── state.js                   Document, mutations, and subscribers
    ├── storage.js                 Reserved for localStorage
    ├── io.js                      Reserved for JSON download and file read
    ├── render-editor.js           Read-only document outline
    ├── render-resume.js           Classic preview DOM
    ├── paginate.js                Reserved for A4 page packing
    ├── dnd.js                     Reserved for section reordering
    ├── preview-scale.js           Reserved for fitting the preview
    ├── main.js                    Startup and subscriptions
    └── shell.js                   Navigation, overview, and print
```

Scripts are loaded with `defer` in that order. Reserved files keep the load order stable and do not add behavior yet.

## Getting started

Replace `YOUR_USERNAME` with the GitHub account that hosts the repository.

```bash
git clone https://github.com/YOUR_USERNAME/offline-resume-builder.git
cd offline-resume-builder
```

Open `index.html` in a current desktop browser. A double-click is enough. No install step and no local server are required.

The sample resume appears immediately. Use the pill navigation or the hero buttons to move between the editor, templates, preview, and settings.

## Usage

| Action | What happens now |
| --- | --- |
| Open the file | The sample resume loads in memory and both views render. |
| Resume Editor | Shows the read-only outline and the Classic preview together. |
| Templates | Shows three cards. Only Classic can be selected. |
| Preview | Shows the A4 page without the outline. |
| Settings | States that the page is local, that saving is not active, and that Export PDF uses the print dialog. |
| Create Resume | Scrolls to the editor. It does not clear the sample. |
| Preview Resume | Scrolls to the preview. |
| Export PDF | Opens the browser print dialog. Choose Save as PDF there. |

In the print dialog, margins and background graphics follow the browser defaults. The stylesheet asks for an A4 page with no extra page margin. The resume text stays selectable because it is HTML, not a canvas image.

Refreshing the page loads the sample again. Edits made through the state API in the console are not stored.

## Offline behavior and privacy

The application files are local. Stylesheets and scripts use relative paths. The JavaScript does not call `fetch`, `XMLHttpRequest`, or `localStorage`.

Resume content stays in the page until it is closed. The overview reports "Not saved on this device" because that is the current behavior.

The sample resume contains `https://example.com/...` links and a `mailto:` address. Those are document content. The application does not request them. A click follows the link only if you choose to.

Print uses the browser's own dialog. This project does not send the resume to a PDF service.

## Testing

There is no automated test suite in the repository.

During development, the JavaScript files were syntax-checked with Node's `node --check`. A temporary Node script, which is not committed, loaded `schema.js`, `sample.js`, and `state.js` and checked the sample shape, frozen snapshots, and state mutations such as rename, add and remove entry, move section, and rejected imports. `validate.js` was not part of that check because it has no validator yet.

Manual checks in a desktop browser:

| Check | Result |
| --- | --- |
| Sample resume renders in the Classic preview | Passed |
| Overview shows Classic, 10 of 10 completed sections, and "Not saved on this device" | Passed |
| Page count follows the measured preview height | Passed for the current sample, which fits one A4 page |
| Templates view disables Modern and Creative | Passed |
| Print media hides the dark chrome and leaves a white page with dark resume text | Passed in emulated print media, not by saving a PDF file |
| Wide layout uses two columns; a 390px-wide layout does not scroll the document sideways | Passed |

These checks do not cover a form editor, JSON files, `localStorage`, drag-and-drop, or multi-page breaks. Those features are not built.

## Roadmap

- [x] Phase 1 — Application shell and basic Classic preview
- [x] Design update — Dark glass interface
- [ ] Phase 2 — Complete resume editor
- [ ] Phase 3 — Modern and Creative templates
- [ ] Phase 4 — A4 pagination and PDF layout
- [ ] Phase 5 — Section reordering and preview scaling
- [ ] Phase 6 — JSON import and export, and local persistence
- [ ] Phase 7 — Requirement pass and bug fixes

Phase 4 here means page breaking that matches print. A print button and print CSS already exist from the design update.

## Possible later work

These are not part of the current build:

- A committed browser test for the state module.
- Screenshot assets in `assets/screenshots/`.
- A visible warning in the print dialog about margin and background settings.
- A license file, once the author chooses one.

## What the project demonstrates

The current code demonstrates:

- Semantic HTML and a stylesheet split between the application and the printable document.
- DOM rendering without `innerHTML`.
- A single document object, copied and frozen before listeners see it.
- A section catalog that describes fields, including string lists.
- Responsive layout and `prefers-reduced-motion`.
- Print CSS that removes the interface from the printed page.

Browser storage, file reading, and import validation are assigned to `storage.js`, `io.js`, and `validate.js`. Those files are placeholders.

## Acknowledgements

This project is coursework for the Bharat Space Education Research Centre (BSERC) GenAI Internship, Week 2, Project 3.

## License

Licensing has not been specified. This repository does not include a license file.
