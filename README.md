# Booster AI Website

A premium Arabic-first bilingual website for Booster AI, focused on the **Diagnose, Build, Boost** approach.

## Preview locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/`.

## Pages

- `index.html`: homepage, three-stage approach, explanatory workflow, ecosystem banners, and CTA
- `contact.html`: simplified four-field contact form with a staged bilingual success state

## Project structure

- `styles.css`: responsive visual system, dotted canvas, Arabic and English typography, RTL/LTR layouts, diagrams, and reduced-motion behavior
- `app.js`: Arabic-default localization, language persistence, navigation, sticky header, and privacy-preserving local form behavior
- `assets/brand/`: Booster AI brand assets
- `assets/logos/`: ecosystem marks and their source/license notes
- `assets/fonts/`: self-hosted English and Arabic fonts with license files

## Languages

Arabic is the source-visible default with `lang="ar"` and `dir="rtl"`. The visible language switch provides a complete English experience, updates metadata and direction, and remembers the visitor's preference locally.

## Contact form

The four-field form currently transmits no data. Its bilingual success state remains hidden until a real endpoint confirms receipt. Before public launch, connect and test a verified form endpoint, show success only after a successful response, and add privacy wording for the real data path.

## Deployment

GitHub Pages publishes the current `main` branch from the repository root at:

https://moltboty.github.io/booster-ai/

Custom-domain hosting and the production contact endpoint will be completed separately before the final public launch.
