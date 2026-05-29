## Why

De Node.js versie wordt momenteel op drie plekken verschillend gedeclareerd, wat de build niet reproduceerbaar maakt:

- `.nvmrc` → `v24.14.0`
- `package.json` `engines.node` → `>=18.x` (zwevende range)
- `.github/workflows/claude.yml` → `node-version: '20'`

Lokale ontwikkeling, CI en de Vercel-runtime kunnen hierdoor op drie verschillende Node-majors draaien. We willen één vaste versie als single source of truth zodat gedrag overal hetzelfde is.

## What Changes

- `.nvmrc` blijft de single source of truth met de vaste versie `v24.14.0`
- `package.json` `engines.node` wordt vastgezet op `24.x` (Vercel kiest de function-runtime op basis van de major) in plaats van de zwevende `>=18.x`
- De CI-workflow leest de Node-versie uit `.nvmrc` via `node-version-file` in plaats van de hardcoded `'20'`

Node 24 is GA op Vercel voor builds en functions, dus de productie-runtime blijft ondersteund.

## Capabilities

### New Capabilities
- `node-toolchain`: Eén vaste Node.js versie als single source of truth (`.nvmrc`), consistent toegepast in `package.json` engines en in CI

### Modified Capabilities
<!-- Geen bestaande capabilities worden gewijzigd — alleen toolchain-configuratie -->

## Impact

- **Geen runtime code changes**: alleen configuratiebestanden (`package.json`, `.nvmrc`, CI-workflow)
- **CI**: `actions/setup-node` gebruikt `node-version-file: '.nvmrc'`; toekomstige versie-bumps gebeuren op één plek
- **Vercel**: function-runtime volgt `engines.node` (`24.x`), nu expliciet en reproduceerbaar
- **Geen breaking changes** voor de applicatielogica
