# Booster AI Website — QA Evidence

## Automated checks

- JavaScript syntax: `node --check app.js` — PASS
- HTML conformance: `html-validate index.html` — PASS, 0 errors and 0 warnings
- Recursive static verifier: PASS, 0 warnings, 1 page
- Lighthouse final audit:
  - Performance: **99**
  - Accessibility: **100**
  - Best Practices: **100**
  - SEO: **100**

## Functional browser checks

CDP-emulated mobile viewport: **390 × 844**

- `innerWidth`: 390
- document `scrollWidth`: 390
- Horizontal overflow: none
- Mobile menu opens with focus moved to navigation; underlying content becomes inert; Escape closes it and returns focus to the toggle
- Opportunity choices update `aria-pressed`
- Selecting multiple patterns enables the brief-copy action
- Copy succeeds when clipboard access is available; the tested denied-clipboard path exposes and selects the complete generated brief for manual copying
- All internal fragment links resolve
- Exactly one H1
- Reduced-motion media query successfully emulated
- With script execution disabled, the inactive assessment is hidden and a readable workflow-evidence checklist appears with no horizontal overflow

## Visual checks

- Desktop first viewport rendered at 1440 × 1000 and inspected
- Full mobile page rendered through CDP at 390px and inspected
- Fixed an initial below-fold reveal issue that caused blank full-page captures
- Fixed mobile flow-board/footer overlap
- No remaining clipping, overlap, missing sections, or unexplained blank areas observed

## Accessibility repairs

- Darkened muted and red signal colors to meet contrast requirements
- Removed a conflicting explicit accessible name from the brand link
- Re-ran Lighthouse accessibility: 100, 0 failed accessibility audits

## Performance repair

- Replaced external Google Fonts requests with four local WOFF2 files
- Final performance score improved from 87 to 99

## Integrity

- No invented client logos, testimonials, certifications, awards, prices, contact details, or case-study outcomes
- The 30% statement is explicitly presented as an ambition for suitable tasks, not a guaranteed result
- No fake contact submission behavior
- Public deployment remains gated on explicit approval

## Independent review disposition

- Fixed the denied-clipboard fallback by exposing and selecting a complete readonly brief
- Fixed mobile-menu focus management, Escape behavior, focus return, and underlying-content inertness
- Added and executed a no-JavaScript opportunity-preparation fallback
- Public-launch blocker remains intentionally open: the user must provide a confirmed booking URL, email address, or form endpoint
- Saudi/GCC positioning remains an explicit assumption until the user confirms the target geography
