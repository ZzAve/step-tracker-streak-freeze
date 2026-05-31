# node-toolchain Specification

## Purpose
TBD - created by archiving change pin-node-version. Update Purpose after archive.
## Requirements
### Requirement: Single pinned Node.js version
The system SHALL declare one fixed Node.js version in `.nvmrc` as the single source of truth for local development, CI, and the production runtime.

#### Scenario: Local version selection
- **WHEN** a developer runs `nvm use` in the repository root
- **THEN** Node.js `v24.14.0` is selected from `.nvmrc`

### Requirement: Consistent engines constraint
The system SHALL pin `package.json` `engines.node` to the same major version as `.nvmrc` so the Vercel function runtime is reproducible.

#### Scenario: Engines reflects pinned major
- **WHEN** `engines.node` is read from `package.json`
- **THEN** it equals `24.x`, matching the `.nvmrc` major version

#### Scenario: Vercel runtime selection
- **WHEN** the project is deployed to Vercel
- **THEN** the Node.js function runtime is selected based on `engines.node` (`24.x`), a supported Vercel runtime

### Requirement: CI uses the pinned version
The system SHALL configure CI to read the Node.js version from `.nvmrc` rather than hardcoding a version.

#### Scenario: CI Node setup
- **WHEN** the GitHub Actions workflow sets up Node.js via `actions/setup-node`
- **THEN** it uses `node-version-file: '.nvmrc'` so CI runs on the same version as local development

