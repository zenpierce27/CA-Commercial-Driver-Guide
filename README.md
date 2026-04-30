# CA Commercial Driver Guide

Personal study app for the California Class A CDL — built as a static PWA for phone-friendly offline use.

## Tests covered

- General Knowledge (Sections 1, 2, 3) — required for all CDL classes
- Air Brakes (Section 5) — removes the L/Z restriction
- Combination Vehicles (Section 6) — required for Class A
- Doubles / Triples (Section 7) — endorsement T
- Tanker (Section 8) — endorsement N
- Pre-Trip Walkaround flashcards — based on **2023 Modernized Vehicle Inspection (Section 11M)**

Hazmat (H) is intentionally **not** included.

> Note: "Air Brakes" and "Manual transmission" are restriction removals on the CA CDL, not endorsements. The actual test endorsements you're adding are **T** (doubles/triples) and **N** (tanker).

## Source materials

All content is grounded in:

- **DL-650** California Commercial Driver Handbook (2019-2021 — current `comlhdbk.pdf` on dmv.ca.gov)
- **DL-650-X (N1, January 2023)** — Modernized Supplement, replaces Section 11 inspection content with Section 11M

The 2023 supplement is the source of truth for vehicle inspection, NOT the legacy Section 11 in the main handbook.

## Repo layout

```
.
├── app/                          # the deployed web app (set this as build dir)
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js                     # service worker (offline cache)
│   ├── icons/                    # PWA icons (SVG; PNG TBD)
│   ├── js/
│   │   ├── main.js               # router + home dashboard
│   │   ├── quiz.js               # quiz engine (drill / mock / weak-spots)
│   │   ├── walkaround.js         # pre-trip flashcards
│   │   ├── data.js               # loads JSON, shuffle helper
│   │   └── db.js                 # IndexedDB (history, attempts, settings)
│   └── data/
│       ├── sections.json         # bank metadata
│       ├── inspection/
│       │   └── walkaround.json   # pre-trip flashcards (11M)
│       └── questions/
│           ├── general-knowledge.json
│           ├── air-brakes.json
│           ├── combination-vehicles.json
│           ├── doubles-triples.json
│           └── tank-vehicles.json
└── README.md
```

## Run locally

```bash
cd app
python3 -m http.server 8080
# open http://localhost:8080
```

(Service workers and ES modules need a real HTTP server — `file://` won't work.)

## Deploy

The repo is private, so GitHub Pages on the free tier is out. Use **Cloudflare Pages**:

1. Sign in at [pages.cloudflare.com](https://pages.cloudflare.com).
2. Connect to GitHub → select `CA-Commercial-Driver-Guide`.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: `app`
4. Save and deploy. You'll get a `*.pages.dev` URL.
5. On your phone, open that URL in Safari/Chrome → Add to Home Screen → installs as a PWA, works offline.

(Alternatives: Netlify, Vercel — same flow, same `app/` build dir.)

## Question bank format

```json
{
  "id": "gk-001",
  "sectionId": "general-knowledge",
  "question": "...",
  "choices": ["A", "B", "C"],
  "answer": 1,
  "explanation": "Why B is right.",
  "citation": "DL-650 §X.Y"
}
```

Stable IDs: `<bankPrefix>-<###>` (e.g., `gk-001`, `ab-007`). When adding questions, increment the number — never reuse an ID.

## Adding more questions

1. Append to the relevant `app/data/questions/<bank>.json`.
2. Bump `id` sequentially (never reuse).
3. Cite the handbook section/subsection in `citation`.
4. Push — Cloudflare Pages auto-rebuilds.

## Disclaimer

Questions are derived from the public CA DMV handbook content. They are not the official DMV exam questions. The DMV's question pool is not published. This app trains the same concepts the test will test.

## Roadmap

- [ ] Expand each bank to 50-100 questions
- [ ] Reading mode (in-app handbook viewer per section)
- [ ] Mock exam mode mirroring CA test structure
- [ ] Spaced-repetition algorithm tuned for the timeline
- [ ] Audio mode for in-cab study (TTS questions)
- [ ] PNG icons (192/512) for iOS home-screen install
