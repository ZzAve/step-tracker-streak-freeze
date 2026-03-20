## Context

The project serves two HTML pages (`public/index.html` and `public/keys.html`) with fully inline CSS. Both pages share a design system of ~23 duplicated CSS rule groups covering design tokens, resets, layout, cards, modals, loading states, animations, and utilities. The duplication means any visual change risks divergence between pages.

## Goals / Non-Goals

**Goals:**
- Extract all shared CSS into a single `public/shared.css` file
- Both HTML pages link to `shared.css` and retain only page-specific styles inline
- Zero visual regression — pages look identical before and after

**Non-Goals:**
- Introducing a CSS framework, preprocessor, or build step
- Refactoring page-specific styles or renaming classes
- Adding new pages or changing the design system itself

## Decisions

### 1. Single shared stylesheet vs. multiple partials
**Decision**: One `public/shared.css` file.
**Rationale**: The project has only two pages and no build tooling. A single file keeps things simple with no bundling needed. If more pages are added later, this can be split.
**Alternative considered**: Multiple files (`tokens.css`, `components.css`, etc.) — rejected as over-engineering for two pages.

### 2. Link placement
**Decision**: Add `<link rel="stylesheet" href="/shared.css">` before the inline `<style>` block in each HTML file.
**Rationale**: This lets page-specific inline styles naturally override shared styles via CSS specificity/cascade order without needing `!important`.

### 3. What stays inline
**Decision**: Only styles unique to a single page remain in its `<style>` block. Styles shared by both pages move to `shared.css`.
**Rationale**: Minimal inline CSS keeps the HTML readable and the shared file authoritative.

## Risks / Trade-offs

- **Extra HTTP request** → Negligible for a two-page app; the shared file will be cached after first load.
- **Subtle specificity changes** → Mitigated by placing `<link>` before `<style>`, preserving cascade order. Visual testing confirms no regression.
