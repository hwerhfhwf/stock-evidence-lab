# FinScope Live Research Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a high-density, readable A-share research workbench backed by live Fuyao data with optional server-side iFinD enrichment and honest module-level degradation.

**Architecture:** Extend the existing Worker API into a normalized research bundle, then make the browser consume it through a small data client and render a redesigned evidence-led dashboard. Fuyao is the required source; iFinD is an optional enhancement boundary and never blocks the primary page.

**Tech Stack:** Cloudflare-style Worker modules, vanilla ES modules, semantic HTML, CSS Grid, accessible inline SVG, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-29-live-research-workbench-design.md`

## Global Constraints

- Keep all provider secrets server-side; never serialize them into HTML, JavaScript or API responses.
- Use no fabricated market, valuation, peer, news or macro values.
- Preserve objective fact, analysis inference and temporarily unverifiable states.
- Body text is 14–16px; no decision-relevant text below 12px.
- Fuyao failure may trigger the labelled BYD disclosure fallback; iFinD failure only degrades its own module.
- Do not add buy/sell advice or a single good/bad company score.

## Review Focus

- Empty/invalid search must not issue an upstream request or replace the current company.
- A partial Fuyao response must retain available modules and show local errors for missing modules.
- Null/negative valuation fields must render as unavailable/raw values, never zero or “cheap”.
- iFinD missing, timed out or rate-limited must not break Fuyao-backed content.
- Charts with one point, null values or narrow mobile width must remain readable and accessible.

---

### Task 1: Extend the live research API

**Files:**
- Modify: `worker/fuyao.js`
- Modify: `worker/research.js`
- Modify: `worker/index.js`
- Create: `worker/ifind.js`
- Test: `tests/fuyao.test.mjs`
- Test: `tests/research.test.mjs`
- Test: `tests/worker.test.mjs`

**Interfaces:**
- Consumes: Fuyao `ApiResponse` envelopes and optional `IFIND_MCP_URL` deployment binding.
- Produces: `buildResearchBundle(client, thscode, now, options)` with `modules.market`, `financials`, `indicators`, `valuation`, `industry`, and `context` statuses.

- [ ] **Step 1: Write failing tests for valuation normalization, optional context degradation and partial-bundle preservation.**
- [ ] **Step 2: Run `node --test tests/fuyao.test.mjs tests/research.test.mjs tests/worker.test.mjs`; expect failures for missing interfaces.**
- [ ] **Step 3: Add `valuations(thscodes)` and the optional iFinD boundary; keep all errors module-local.**
- [ ] **Step 4: Add `/api/research` company metadata passthrough and safe provider status fields.**
- [ ] **Step 5: Run the focused tests and then `npm test`; expect all tests to pass.**
- [ ] **Step 6: Commit the API task.**

### Task 2: Create the browser data and view model

**Files:**
- Create: `ui/data-client.js`
- Create: `ui/research-view.js`
- Modify: `scripts/build-worker.mjs`
- Modify: `worker/index.js`
- Test: `tests/data-client.test.mjs`
- Test: `tests/research-view.test.mjs`
- Test: `tests/live-ui-contract.test.mjs`

**Interfaces:**
- Consumes: `/api/search`, `/api/research`, `BYD_SNAPSHOT`.
- Produces: `createResearchClient(fetchFn)`, `normalizeResearchView(bundle, company, fallback)`, chart-ready series and explicit source state.

- [ ] **Step 1: Write failing tests for search encoding, live bundle normalization, null values, partial modules and fallback labelling.**
- [ ] **Step 2: Run the three focused tests; expect failures because the modules do not exist.**
- [ ] **Step 3: Implement the data client and pure view-model functions without DOM dependencies.**
- [ ] **Step 4: Expose the modules through the Worker build and static routes.**
- [ ] **Step 5: Run focused tests and `npm test`; expect all tests to pass.**
- [ ] **Step 6: Commit the browser-data task.**

### Task 3: Rebuild the research interface and charts

**Files:**
- Replace: `ui/index.html`
- Replace: `ui/styles.css`
- Replace: `ui/app.js`
- Test: `tests/ui-contract.test.mjs`
- Test: `tests/live-ui-contract.test.mjs`
- Test: `tests/workbench.test.mjs`

**Interfaces:**
- Consumes: `createResearchClient` and `normalizeResearchView` from Task 2.
- Produces: search-driven dashboard, donut composition chart, operating trend, price/volume chart, valuation strip and evidence drawer.

- [ ] **Step 1: Update contract tests first for semantic regions, live-data hooks, minimum typography tokens and required chart containers.**
- [ ] **Step 2: Run the UI tests; expect them to fail against the old interface.**
- [ ] **Step 3: Replace HTML with the approved research order and accessible loading/error regions.**
- [ ] **Step 4: Replace CSS with the 12-column dense layout and readable typography system.**
- [ ] **Step 5: Replace app rendering with live search/research orchestration and accessible SVG charts.**
- [ ] **Step 6: Run focused tests and `npm test`; expect all tests to pass.**
- [ ] **Step 7: Commit the UI task.**

### Task 4: Validate, document and publish

**Files:**
- Modify: `README.md`
- Modify: `docs/product-handoff.md`
- Create: `docs/live-data-architecture.md`
- Update: `docs/finscope-desktop.png`

**Interfaces:**
- Consumes: the complete Worker build and live deployment environment.
- Produces: tested source, current screenshot, documented provider responsibilities and a published Site version.

- [ ] **Step 1: Add documentation-contract tests for provider responsibilities, secrets and fallback behavior.**
- [ ] **Step 2: Run the documentation tests and verify they fail before edits.**
- [ ] **Step 3: Update README and handoff documentation with setup and live/fallback semantics.**
- [ ] **Step 4: Run `npm test` and `npm run build`; expect a clean pass.**
- [ ] **Step 5: Serve locally and verify desktop/mobile visuals, search, live BYD data, fallback and keyboard navigation.**
- [ ] **Step 6: Capture the verified desktop screenshot, push the branch, save and deploy the exact commit, then verify production HTTP and data endpoints.**
- [ ] **Step 7: Commit documentation and validation artifacts.**

