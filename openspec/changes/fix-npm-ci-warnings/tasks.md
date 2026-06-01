## 1. CI update

- [x] 1.1 Update `node-version` in `.github/workflows/ci.yml` from `'20'` to `'24'`

## 2. npm overrides

- [x] 2.1 Add `overrides` block to `package.json` with `glob: "^13.0.0"` and `tar: ">=7.5.8"`
- [x] 2.2 Regenerate `package-lock.json` via `npm install --package-lock-only`
- [x] 2.3 Verify `node_modules/glob` resolves to 13.x and `node_modules/tar` resolves to 7.5.15+

## 3. garmin-connect

- [x] 3.1 Check whether a newer `garmin-connect` release removes the `crypto@1.0.1` dep — confirmed still at 1.6.2 with no newer published version resolving the dep; upstream fix required.
