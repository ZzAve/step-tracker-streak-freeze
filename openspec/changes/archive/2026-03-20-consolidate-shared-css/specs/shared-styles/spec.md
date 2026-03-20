## ADDED Requirements

### Requirement: Shared CSS file contains all common design tokens
The system SHALL provide a `public/shared.css` file that defines all CSS custom properties (`:root` variables) used across multiple pages, including color tokens (`--bg`, `--surface`, `--surface-alt`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--accent-glow`, `--green`, `--green-bg`, `--red`, `--red-bg`), spacing/shape tokens (`--radius`, `--radius-sm`), and any additional tokens shared by both pages.

#### Scenario: Design tokens are defined once
- **WHEN** `public/shared.css` is loaded
- **THEN** all shared CSS custom properties are available and match their current values from `index.html`

### Requirement: Shared CSS file contains common base styles
The system SHALL include the global reset (`*`), `body` styles, and `header` layout styles in `shared.css`.

#### Scenario: Base styles apply to all pages
- **WHEN** a page links to `shared.css`
- **THEN** the box-sizing reset, body background/font, and header flex layout are applied without inline duplication

### Requirement: Shared CSS file contains common component styles
The system SHALL include `.card`, `.card-label`, modal system (`.modal-overlay`, `.modal-overlay.open`, `.modal-card`, `.modal-title`, `.modal-text`, `.modal-actions`, `.btn-modal-cancel`, `.btn-modal-danger` and their hover states), `.state-screen`, `.spinner`, and `.app-title` styles in `shared.css`.

#### Scenario: Component styles render identically
- **WHEN** both `index.html` and `keys.html` link to `shared.css`
- **THEN** cards, modals, loading states, and app title render identically to the pre-consolidation state

### Requirement: Shared CSS file contains common animations and utilities
The system SHALL include `@keyframes spin`, `@keyframes fadeInUp`, and `.hidden` utility class in `shared.css`.

#### Scenario: Animations and utilities work on all pages
- **WHEN** a page links to `shared.css`
- **THEN** `fadeInUp`, `spin` animations and `.hidden` utility function correctly

### Requirement: HTML pages link to shared stylesheet
Each HTML page (`index.html`, `keys.html`) SHALL include a `<link rel="stylesheet" href="/shared.css">` tag before its inline `<style>` block.

#### Scenario: Shared styles load before page-specific styles
- **WHEN** a page is loaded in the browser
- **THEN** `shared.css` is loaded before inline styles, allowing page-specific overrides via cascade

### Requirement: No visual regression after consolidation
After consolidation, both pages SHALL render identically to their pre-consolidation appearance.

#### Scenario: Index page visual parity
- **WHEN** `index.html` is loaded after consolidation
- **THEN** all elements appear identical to the pre-consolidation version

#### Scenario: Keys page visual parity
- **WHEN** `keys.html` is loaded after consolidation
- **THEN** all elements appear identical to the pre-consolidation version

### Requirement: Page-specific styles remain inline
Styles unique to a single page SHALL remain in that page's inline `<style>` block and MUST NOT be moved to `shared.css`.

#### Scenario: Index-only styles stay in index.html
- **WHEN** a CSS rule is only used in `index.html` (e.g., `--frost`, `--frost-bg`, `--gold`, and page-specific component styles)
- **THEN** that rule remains in the `index.html` inline `<style>` block

#### Scenario: Keys-only styles stay in keys.html
- **WHEN** a CSS rule is only used in `keys.html`
- **THEN** that rule remains in the `keys.html` inline `<style>` block
