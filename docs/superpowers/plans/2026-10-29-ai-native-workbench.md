# FinScope AI Native Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, source-backed AI Native A-share company research workbench that satisfies the third exam prompt end to end.

**Architecture:** Extend the existing Cloudflare Worker and static JavaScript UI rather than replacing the working Fuyao integration. Add a validated research protocol between deterministic analytics, evidence provenance, optional OpenAI-compatible LLM output, and a fixed chart renderer. Rebuild the presentation as a dense continuous research canvas while preserving module-level degradation.

**Tech Stack:** Cloudflare Worker JavaScript, static ES modules, SVG visualizations, Node test runner, existing build scripts.

**Spec:** `docs/superpowers/specs/2026-10-29-ai-native-workbench-final-design.md`

## Global Constraints

- No deterministic price prediction, return promise, direct buy/sell recommendation, or simple good/bad label.
- Every factual value must retain source, time, unit, scope, and drilldown metadata.
- AI output must be schema validated and may not execute arbitrary code.
- Missing, stale, conflicting, or failed data is rendered locally and never converted into a normal result.
- The public page works without an LLM key; BYOK uses only the current browser session.
- Desktop target is 1440×900; responsive targets are 375, 768, 1024, and 1440 pixels.

## Review Focus

- A live API returns partial financials or no market series: unaffected modules remain usable and the missing target is explicit.
- A user asks for a metric whose field is unavailable: create an unknown drilldown rather than a value or normal chart.
- An LLM returns malformed JSON, changed source values, or investment advice: reject it and preserve the deterministic workbench.
- Cumulative and single-quarter periods are mixed: period alignment prevents a misleading comparison.
- A keyboard-only user opens a chart point or evidence drawer: the same drilldown is available without hover.

---

### Task 1: Research protocol and deterministic diagnosis

**Files:**
- Create: `ui/research-protocol.js`
- Modify: `ui/diagnosis-model.js`
- Modify: `ui/finscope-data.js`
- Test: `tests/research-protocol.test.mjs`
- Test: `tests/diagnosis-model.test.mjs`

**Interfaces:**
- Produces: `buildSourcePackage(view, fallback)`, `selectDiagnosisDimensions(context)`, `buildResearchClaims(sourcePackage)`, `validateResearchClaim(claim)`.

- [ ] Add failing tests for evidence groups, epistemic states, drilldown types, manufacturing-specific dimension selection, and missing-field unknowns.
- [ ] Run targeted tests and confirm the new protocol imports fail.
- [ ] Implement normalized source packages and deterministic claim generation without changing source values.
- [ ] Run targeted tests and confirm all protocol and diagnosis assertions pass.

### Task 2: AI adapter and validated customization

**Files:**
- Create: `ui/ai-adapter.js`
- Create: `worker/ai.js`
- Modify: `worker/index.js`
- Test: `tests/ai-adapter.test.mjs`
- Test: `tests/worker.test.mjs`

**Interfaces:**
- Consumes: ResearchClaim and SourcePackage from Task 1.
- Produces: `analyzeResearch({ endpoint, model, apiKey, messages, tools, outputSchema })`, `validateChartSpec(spec, sourcePackage)`, `/api/ai/analyze`.

- [ ] Add failing tests for OpenAI-compatible request normalization, session-only credentials, schema rejection, source-value mutation, advice language, and network failure.
- [ ] Implement the provider-neutral adapter and Worker proxy boundary without persisting keys.
- [ ] Implement ChartSpec validation against source fields and chart-type whitelist.
- [ ] Run AI and Worker tests; verify deterministic fallback remains available.

### Task 3: Continuous research canvas shell

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/styles.css`
- Modify: `ui/app.js`
- Test: `tests/ui-contract.test.mjs`
- Test: `tests/live-ui-contract.test.mjs`

**Interfaces:**
- Consumes: normalized research view and selected dimensions.
- Produces: desktop research canvas, responsive navigation, expandable AI command bar, module anchors.

- [ ] Add failing DOM contract tests for the six dimensions, AI controls, source status, responsive landmarks, and prohibited promotional copy.
- [ ] Replace duplicate company/header regions with the compact context bar and continuous 12-column canvas.
- [ ] Implement semantic design tokens and dense responsive layout using the approved palette.
- [ ] Run UI contract tests and build validation.

### Task 4: Source-bound visualizations

**Files:**
- Create: `ui/chart-spec.js`
- Modify: `ui/research-view.js`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Test: `tests/research-view.test.mjs`
- Test: `tests/workbench.test.mjs`

**Interfaces:**
- Consumes: ChartSpec, ResearchClaim, and normalized values.
- Produces: operating relationship, profit conversion, cash bridge, balance flow, valuation anchors, three-track market chart, report-risk graph.

- [ ] Add failing tests for proportional geometry, direct labels, synchronized periods, dashed unknowns, A-share direction colors, and accessible chart fallbacks.
- [ ] Implement fixed SVG renderers; do not render arbitrary AI markup.
- [ ] Bind chart marks to claim and source references with keyboard-accessible controls.
- [ ] Run visualization tests and confirm all source references resolve.

### Task 5: Evidence drilldown and report-driven risk analysis

**Files:**
- Modify: `ui/app.js`
- Modify: `ui/research-view.js`
- Modify: `ui/styles.css`
- Test: `tests/research.test.mjs`
- Test: `tests/workbench.test.mjs`

**Interfaces:**
- Consumes: ResearchClaim drilldowns and source references.
- Produces: period, market interval, peer comparison, unresolved-question drilldowns and a source-specific evidence drawer.

- [ ] Add failing tests for all four drilldown targets, metric-direction divergence versus source conflict, and hidden technical request IDs.
- [ ] Implement cross-highlighting from claim to chart mark to source detail.
- [ ] Implement report timeline selection and risk-variable graph with local missing-data states.
- [ ] Run research and workbench tests.

### Task 6: Live interaction, visual comparison, and resilience

**Files:**
- Modify: `ui/data-client.js`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Modify: `worker/index.js`
- Test: `tests/data-client.test.mjs`
- Test: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: existing `/api/search`, `/api/research`, optional `/api/ai/analyze`.
- Produces: completed BYD default state, company search, question-driven dimension changes, AI preview/apply/undo, local degradation.

- [ ] Add failing tests for default BYD rendering, changing questions, unavailable AI, unavailable peer data, and undo.
- [ ] Implement user flows and preserve existing live-data behavior.
- [ ] Render at 1440×900 and compare against the approved reference hierarchy and density; correct layout, typography, color, and chart proportions.
- [ ] Verify keyboard interaction, reduced motion, 375/768/1024/1440 layouts, and no console errors.

### Task 7: Product audit, documentation, and public delivery

**Files:**
- Modify: `README.md`
- Modify: `AI_USAGE_AND_VALIDATION.md`
- Modify: `TESTING.md`
- Create: `docs/final-requirements-audit.md`
- Create: `docs/finscope-final.png`

**Interfaces:**
- Produces: public URL, public source repository, reproducible setup, requirement traceability.

- [ ] Run the full test and build suite and record actual results.
- [ ] Audit every exam requirement against a visible UI interaction, implementation location, and test.
- [ ] Update README with architecture, data, AI connection, local run, limitations, public links, and screenshots.
- [ ] Commit and push the complete repository, verify repository visibility, deploy the site, and verify production HTTP/content/interactions.
- [ ] Reopen the public product and perform a final AI Native and visual-quality review before marking the goal complete.

