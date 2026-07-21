# Booster AI — Design and Technology Decision

## Chosen approach in plain language

- **Visual direction:** Operational Scan
- **Surface:** Decide/Learn landing page
- **Brand posture:** incisive, energetic and practical—warm off-white paper, deep green-black ink, high-visibility orange as the single signal color
- **Core metaphor:** operational friction becomes visible, is diagnosed, and is converted into a controlled AI-assisted flow
- **Why it fits:** Booster AI begins with discovery rather than selling a generic platform. The page itself should feel like an assessment, not an AI product template.

## Implementation

- **Stack:** semantic HTML, modular CSS, and minimal vanilla JavaScript
- **Page model:** focused one-page marketing site
- **Hosting target:** local preview now; GitHub Pages only after explicit approval
- **Why:** no authentication, database, CMS, or complex application state is required. Static output is faster, easier to maintain, accessible, and ideal for GitHub Pages.

## Motion posture

- Motion explains state: a restrained scan line, workflow path activation and staggered reveal
- CSS-first; JavaScript only for navigation, diagnostic selection, dialog/copy behavior, and viewport-aware enhancement
- `prefers-reduced-motion` removes continuous and scroll-triggered motion
- No looping video, 3D scene, animation library or framework

## Connections

| Requirement | Connection | Where | Secret/fallback |
|---|---|---|---|
| Competitor research | Hermes browser | Research phase only | Completed without API credentials |
| Contact/booking | Not configured | Final CTA prepares/copies an opportunity brief locally | Honest launch dependency; no fake submission |
| Custom imagery | None | CSS/type-based composition | Site does not depend on image-generation credentials |
| GitHub/hosting | GitHub API + Actions + Pages | Only after user approves publication | No remote action in local phase |

## Decision score

| Criterion | Weight | Static site | Astro | React/Vite |
|---|---:|---:|---:|---:|
| Business and audience fit | 25 | 25 | 23 | 21 |
| Content and SEO fit | 20 | 19 | 20 | 16 |
| Interaction complexity fit | 15 | 15 | 14 | 12 |
| Performance/accessibility | 15 | 15 | 14 | 11 |
| Maintainability | 15 | 15 | 13 | 10 |
| Hosting/deployment fit | 10 | 10 | 9 | 8 |
| **Total** | **100** | **99** | **93** | **78** |

## Rejected alternatives

| Alternative | Why rejected now | When appropriate |
|---|---|---|
| Astro | Adds build tooling without enough multi-page content benefit | When the site adds insights, case studies, Arabic routes or a content library |
| React/Vite | Framework overhead for simple progressive interactions | When Booster develops an authenticated assessment or client portal |
| Next.js/full-stack | No database, auth, payment or server API requirement | When booking, accounts, assessments or secure client data require a backend |
| Dark neon AI identity | Too close to current AI-category conventions and regional competitors | Only for a future product console, not the consultancy front door |

## User-facing summary

Booster AI will use a fast static site with a distinctive operational-diagnostic design. It will feel premium and interactive without needing a framework or API, and it can move cleanly to GitHub Pages after approval.
