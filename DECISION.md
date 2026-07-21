# Booster AI Design and Technology Decision

## Decision status
Selected redesign direction: **Operational Warmth** — a softer, modular evolution of the original Operational Scan concept.

## Surface
Primary surface: **Decide / Learn**. The visitor must understand the offer, see how Booster works, and prepare one credible discovery conversation. The page is not a product dashboard, so visual storytelling and one idea per section take priority over dense system chrome.

## Why the original direction changed
The first version was coherent and technically strong, but it applied the engineering/editorial grammar too uniformly: hard rectangles, rules, mono labels, abrupt color fields, and diagram-like content in almost every section. It communicated rigor but not enough warmth, partnership, visual depth, or modularity.

The redesign keeps the distinctive green, cream, and orange identity, strong headline, workflow-first positioning, human-control message, 30% ambition, and opportunity scan. It softens the shape language, reduces repeated copy, varies section rhythm, and turns repeatable content into independent cards with optional detail.

## Visual system
- Warm cream canvas with deep forest green, restrained orange, clay, blush, and sage supporting tones.
- Large soft radii with occasional asymmetric image framing; pills only for compact actions and metadata.
- Subtle shadows, layering, and tactile surfaces instead of full outlines everywhere.
- Space Grotesk for display, Source Sans 3 for readable body copy, and IBM Plex Mono used sparingly for operational metadata.
- One reviewed abstract generated illustration as atmosphere and brand texture—not as documentary evidence.
- Varied compositions: hero image scene, audience strip, expandable process cards, bento solution cards, qualified ambition panel, human-control path, assessment tool, and contained final CTA.

## Modularity
- The four process stages are independent native `<details>` cards.
- The four capability modules are independent articles with optional expandable detail.
- Cards can be added, removed, reordered, or hidden without redesigning adjacent copy.
- Dense explanations remain behind progressive disclosure, while the first scan layer stays short.
- The page deliberately does not turn every section into a card grid.

## Motion posture
- CSS/SVG-style motion explains flow and human checkpoints: moving signals, path activation, card state, and restrained reveal transitions.
- Generated video is rejected for this iteration because it adds less explanatory value than editable CSS motion and carries performance/accessibility costs.
- All nonessential motion stops under `prefers-reduced-motion`.
- Content remains visible when JavaScript or observers fail.

## Generated asset decision
- Four cheap concepts were generated with `black-forest-labs/flux.2-klein-4b` through OpenRouter at USD 0.014 each.
- The selected operational-river direction best provided smoothness, warmth, regional landscape resonance, and visual continuity without generic AI imagery.
- Production asset cost: USD 0.014 for the selected source image.
- The asset is saved locally in optimized WebP with JPEG fallback and documented in `assets/images/GENERATED_ASSETS.md`.
- No API key or runtime generation exists in the frontend.

## Technology
Semantic HTML, CSS, and minimal JavaScript remain the smallest suitable stack.

Reasons:
- The redesign needs content, responsive layout, native disclosure, lightweight state, and CSS motion—not a client framework.
- Static output is fast, easy to preview, and suitable for GitHub Pages if publication is later approved.
- No build process or dependency is needed for the current local prototype.

## Rejected alternatives
- **Keep the original sharp scan interface:** distinctive but too cold and repetitive.
- **Generic rounded SaaS card grid:** softer but would erase Booster's operational character.
- **Cinematic AI video hero:** expensive relative to value, less controllable, and harder to make accessible and performant.
- **Fake product dashboard or client proof:** would imply capabilities or evidence that have not been supplied.
- **React/Vite redesign:** unnecessary for the current interaction level.

## Launch dependencies
The local redesign can be reviewed now. Public launch remains blocked until a confirmed booking URL, contact email, or real form endpoint is supplied and tested.
