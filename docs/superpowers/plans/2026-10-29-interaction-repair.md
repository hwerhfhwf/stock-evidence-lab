# FinScope Interaction Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the finance, operating, market, and AI interactions so a reviewer can read every visual relationship, choose time ranges, switch A-share companies, converse with the assistant, and create a source-bound research view.

**Architecture:** Keep the existing static ES-module UI and Worker APIs. Move chart slicing and assistant intent routing into deterministic tested helpers; SVG renderers remain fixed and source-bound, while the LLM may only select trusted research claims and chart specifications.

**Tech Stack:** Static HTML/CSS/JavaScript, accessible SVG, Cloudflare Worker, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-29-ai-native-workbench-final-design.md`

## Global Constraints

- Do not output price predictions, return promises, direct buy/sell advice, or good/bad labels.
- Facts, inferences, and unavailable information remain distinct and source-bound.
- Missing market, company, or LLM data produces a local explicit state; it is never replaced with an invented normal result.
- Finance chart labels must remain readable without relying on color or hover.
- The API key remains in page memory only and never enters screenshots, logs, or the repository.

## Review Focus

- A cash-coverage ratio below, equal to, and above 100% keeps labels attached to the correct segment.
- A very small asset segment never receives overlapping text inside its rectangle.
- Period selectors with fewer observations than requested select all available rows without padding or inventing values.
- “你好” returns a visible assistant message even without a connected model.
- A switch-company request searches A shares, presents the matched company, and refreshes the complete workbench rather than changing only the header.

---

### Task 1: Finance relationship charts

**Files:**
- Modify: `ui/chart-spec.js`
- Modify: `ui/styles.css`
- Test: `tests/chart-spec.test.mjs`

**Interfaces:**
- Produces: directly labelled cash-coverage and balance-structure charts with accessible legends and proportional geometry.

- [ ] Write failing tests for bound segment labels, surplus/shortfall states, and external asset legends.
- [ ] Run the targeted tests and verify they fail for the current renderers.
- [ ] Implement the minimal chart-model and SVG/CSS changes.
- [ ] Run the targeted tests and verify they pass.

### Task 2: Operating and market exploration

**Files:**
- Modify: `ui/app.js`
- Modify: `ui/index.html`
- Modify: `ui/styles.css`
- Test: `tests/workbench.test.mjs`
- Test: `tests/ui-contract.test.mjs`

**Interfaces:**
- Produces: `selectChartRange(rows, range)` and visible keyboard-operable period selectors for operating and market charts.

- [ ] Write failing tests for numeric y-axis ticks, range slicing, control semantics, and explicit market-data empty state.
- [ ] Verify the new tests fail against the current UI.
- [ ] Implement selectors, axis ticks, range state, and chart rerendering.
- [ ] Verify targeted tests pass.

### Task 3: Conversational AI and A-share switching

**Files:**
- Create: `ui/assistant-intent.js`
- Modify: `ui/app.js`
- Modify: `ui/index.html`
- Modify: `ui/styles.css`
- Test: `tests/assistant-intent.test.mjs`
- Test: `tests/ui-contract.test.mjs`

**Interfaces:**
- Produces: `classifyAssistantInput(text)`, persistent chat messages, deterministic greeting, A-share search/switch flow, and source-bound DIY research preview.

- [ ] Write failing tests for greeting, company-switch, and research intents plus visible chat transcript semantics.
- [ ] Verify the tests fail because the intent module and transcript do not exist.
- [ ] Implement the minimal router, conversation rendering, company switch, and research response path.
- [ ] Verify targeted tests pass.

### Task 4: Product verification and public delivery

**Files:**
- Modify: `README.md`
- Modify: `AI_USAGE_AND_VALIDATION.md`
- Create or update: `docs/finscope-product.png`
- Create or update: `docs/finscope-ai-research.png`

**Interfaces:**
- Produces: verified local product, public GitHub source, public site, and screenshots of the default and AI-assisted flows.

- [ ] Run the full test and build commands with zero failures.
- [ ] Inspect the rendered page at desktop and mobile widths, including keyboard focus and empty states.
- [ ] Exercise greeting, company switch, and one DIY research question without exposing credentials.
- [ ] Update documentation and screenshots, commit, push, deploy, and verify the production URL.
