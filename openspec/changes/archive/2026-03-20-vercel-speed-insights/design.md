## Context

The app is a vanilla HTML/JS project deployed on Vercel. There are two public HTML pages (`index.html`, `keys.html`). No build step or bundler is used — all frontend code is inline in the HTML files.

Vercel Speed Insights provides automatic Core Web Vitals collection for Vercel-hosted projects. For non-framework projects, it offers a script-tag approach that requires no npm dependencies.

## Goals / Non-Goals

**Goals:**
- Enable Vercel Speed Insights on all pages
- Use the vanilla script-tag approach (no npm package, no build step)

**Non-Goals:**
- Custom event tracking or custom metrics
- Vercel Web Analytics (separate product — out of scope)
- Adding a build step or bundler to the project

## Decisions

### Script-tag approach over npm package
Use the `/_vercel/speed-insights/script.js` script tag rather than `@vercel/speed-insights` npm package.

**Rationale**: The project has no bundler or build step. The script-tag approach works natively in vanilla HTML without any tooling changes. The npm package is designed for framework projects (Next.js, SvelteKit, etc.).

**Alternative considered**: Installing `@vercel/speed-insights` and adding a build step — rejected as over-engineering for two HTML files.

### Snippet placement
Place the snippet at the end of `<body>`, after all other scripts, with the `defer` attribute.

**Rationale**: The Speed Insights script should not block page rendering or compete with app scripts. Placing it last with `defer` ensures minimal performance impact.

## Risks / Trade-offs

- **[Vercel-only]** The `/_vercel/speed-insights/script.js` path only works on Vercel deployments. Local dev won't collect metrics. → Acceptable: this is a monitoring feature, not a functional one.
- **[Dashboard enablement]** Speed Insights must also be enabled in the Vercel project dashboard (Settings → Speed Insights). → Document in tasks as a manual step.