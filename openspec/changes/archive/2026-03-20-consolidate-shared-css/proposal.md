## Why

The project has two main HTML pages (`index.html` and `keys.html`) with inline `<style>` blocks that share ~60-70% of their CSS — design tokens, resets, layout primitives, modal system, loading states, animations, and utilities are copy-pasted between them. This duplication makes visual consistency fragile and increases maintenance burden: every design change must be applied in multiple places.

## What Changes

- Extract shared CSS (design tokens, resets, body/header, card system, modal system, loading states, animations, utilities) into a new `public/shared.css` file
- Replace duplicated inline styles in `index.html` and `keys.html` with a `<link>` to the shared stylesheet
- Keep only page-specific styles inline in each HTML file

## Capabilities

### New Capabilities
- `shared-styles`: Shared CSS stylesheet containing design tokens, resets, layout primitives, modal system, loading/spinner states, animations, and utility classes used across pages

### Modified Capabilities

## Impact

- `public/index.html` — inline `<style>` block reduced, gains `<link>` to `shared.css`
- `public/keys.html` — inline `<style>` block reduced, gains `<link>` to `shared.css`
- `public/shared.css` — new file containing consolidated shared styles
- No API, database, or dependency changes
