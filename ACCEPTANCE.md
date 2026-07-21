# Booster AI Website Acceptance Checklist

## Research and strategy
- [x] Current live competitors and references are documented with URLs
- [x] Design principles are transformed rather than copied
- [x] Style, stack, motion, and API decisions are explained in `DECISION.md`

## Content and conversion
- [x] Hero clearly states the business outcome and Booster AI method
- [x] Consultation, workflow discovery, AI agents, and automation are explained
- [x] The 30% figure is presented as an ambition for suitable work, not a guarantee
- [x] No clients, testimonials, prices, certifications, contact details, or outcomes are invented
- [x] Primary CTA has an honest local behavior and no fake submission success

## Design and responsiveness
- [x] Composition is intentionally Decide/Learn, not a generic feature-card template
- [x] Desktop visual hierarchy and spacing are inspected
- [x] Real 390×844 mobile viewport is inspected with no horizontal overflow
- [x] Navigation and interactive targets are at least 44px on mobile
- [x] Motion supports meaning and respects `prefers-reduced-motion`

## Accessibility and function
- [x] Semantic landmarks and one clear H1
- [x] Keyboard-visible focus states and working skip link
- [x] Contrast supports readable body and control text
- [x] All buttons and links work
- [x] No missing local HTML, CSS, JS, favicon, or image assets
- [x] No uncaught browser console errors

## Quality
- [x] Static verifier passes recursively
- [x] HTML/CSS/JS syntax checks pass
- [x] Anti-slop diagnostic has no unresolved compositional tell
- [x] Independent reviewer found no unresolved local-review blocker
- [x] Local preview is open for user review and returned HTTP 200

## Deployment gate
- [x] No remote repository or public deployment without explicit user approval
- [ ] If approved later, GitHub Pages build and live URL are verified
