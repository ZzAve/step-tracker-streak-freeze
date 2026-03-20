## ADDED Requirements

### Requirement: Speed Insights script on all pages
Every public HTML page SHALL include the Vercel Speed Insights snippet before the closing `</body>` tag. The snippet consists of:
1. An inline script that initializes the `window.si` queue function
2. A deferred script tag loading `/_vercel/speed-insights/script.js`

#### Scenario: index.html includes Speed Insights
- **WHEN** a user loads the dashboard page (`index.html`)
- **THEN** the page source MUST contain the Speed Insights queue initializer and deferred script tag

#### Scenario: keys.html includes Speed Insights
- **WHEN** a user loads the API keys page (`keys.html`)
- **THEN** the page source MUST contain the Speed Insights queue initializer and deferred script tag

#### Scenario: Script does not block rendering
- **WHEN** the Speed Insights script loads
- **THEN** it MUST use the `defer` attribute to avoid blocking page rendering

### Requirement: Speed Insights enabled in Vercel dashboard
The Vercel project MUST have Speed Insights enabled in the project settings to receive collected metrics.

#### Scenario: Metrics appear in Vercel dashboard
- **WHEN** a user visits the deployed site after Speed Insights is enabled
- **THEN** Core Web Vitals data (LCP, FID, CLS, TTFB) SHALL appear in the Vercel Speed Insights dashboard