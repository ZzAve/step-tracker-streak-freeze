## 1. Create shared stylesheet

- [x] 1.1 Create `public/shared.css` with all shared CSS: design tokens (`:root` variables), global reset (`*`), `body` styles, `header` layout, `.app-title`, `.card` and `.card:nth-child(2)`, `.card-label`, modal system (`.modal-overlay`, `.modal-card`, `.modal-title`, `.modal-text`, `.modal-actions`, `.btn-modal-cancel`, `.btn-modal-danger` with hover states), `.state-screen`, `.spinner`, `@keyframes spin`, `@keyframes fadeInUp`, `.hidden`

## 2. Update HTML pages

- [x] 2.1 In `index.html`, add `<link rel="stylesheet" href="/shared.css">` before the inline `<style>` block and remove all CSS rules that are now in `shared.css`, keeping only index-specific styles (e.g., `--frost`, `--frost-bg`, `--gold`, and page-specific component styles)
- [x] 2.2 In `keys.html`, add `<link rel="stylesheet" href="/shared.css">` before the inline `<style>` block and remove all CSS rules that are now in `shared.css`, keeping only keys-specific styles

## 3. Verification

- [x] 3.1 Visually verify `index.html` renders identically to pre-consolidation state
- [x] 3.2 Visually verify `keys.html` renders identically to pre-consolidation state
- [x] 3.3 Confirm no duplicate rules exist between `shared.css` and either page's inline styles
