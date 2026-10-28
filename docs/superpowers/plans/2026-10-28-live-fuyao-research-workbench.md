# Live Fuyao Research Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将静态单股原型升级为使用扶摇真实数据的多标的客户级研究工作台。

**Architecture:** Cloudflare Worker 同时服务 UI 和受控 API 网关；运行时密钥仅在服务端。网关聚合扶摇 REST 数据，浏览器确定性引擎计算诊断和图表指标。

**Tech Stack:** Cloudflare Worker ESM、原生 HTML/CSS/JavaScript、Node.js built-in test runner、Sites runtime secrets

**Spec:** `docs/superpowers/specs/2026-10-28-live-fuyao-research-workbench-design.md`

## Global Constraints

- `FUYAO_API_KEY` 只能通过运行时环境注入。
- 上游业务成功必须同时满足 HTTP 成功且 `code === 0`。
- `null` 保持缺失，不补零。
- 不输出买卖建议、目标价或确定性涨跌预测。
- 仅允许已声明端点、合法 A 股 thscode 和有界时间窗口。

## Review Focus

- Key 缺失或权限不足时不泄露凭据且按模块降级。
- 三表不同期次或空数组时不得错位计算。
- 行情历史不足 120 点时均线保持未知。
- 搜索结果必须消歧，不由前端猜交易所。
- 单个上游端点失败时其他成功模块仍可用。

---

### Task 1: 扶摇网关契约

**Files:**
- Create: `worker/fuyao.js`
- Create: `tests/fuyao.test.mjs`

**Interfaces:**
- Produces: `createFuyaoClient(fetchFn, apiKey)`, `normalizeEnvelope(response)`, `validateThscode(value)`

- [ ] 写失败测试覆盖鉴权缺失、业务错误、部分失败与输入校验。
- [ ] 运行测试并确认因模块缺失失败。
- [ ] 实现最小网关客户端并通过测试。

### Task 2: 研究聚合与确定性计算

**Files:**
- Create: `worker/research.js`
- Create: `tests/research.test.mjs`

**Interfaces:**
- Consumes: `createFuyaoClient`
- Produces: `buildResearchBundle(client, thscode, now)`, `calculateMarketSignals(bars)`

- [ ] 写失败测试覆盖并发聚合、MA、收益、回撤、空序列和多期对齐。
- [ ] 实现聚合与计算并通过测试。

### Task 3: Worker 路由与页面

**Files:**
- Create: `worker/index.js`
- Modify: `.openai/hosting.json`
- Create: `scripts/build-worker.mjs`
- Create: `tests/worker.test.mjs`

**Interfaces:**
- Produces: `/`, `/api/health`, `/api/search`, `/api/research`

- [ ] 写失败测试覆盖静态页面、查询校验、错误状态与安全响应头。
- [ ] 实现 Worker 路由并通过测试。

### Task 4: 上限版交互工作台

**Files:**
- Create: `ui/index.html`
- Create: `ui/styles.css`
- Create: `ui/app.js`
- Create: `tests/live-ui-contract.test.mjs`

**Interfaces:**
- Consumes: `/api/search`, `/api/research`
- Produces: 多标的搜索、实时状态、SVG 行情图、指标矩阵、诊断卡与证据抽屉。

- [ ] 写 UI 合同失败测试。
- [ ] 实现搜索、加载、部分失败、图表与证据交互。
- [ ] 运行完整测试。

### Task 5: 真实调用、密钥与发布

**Files:**
- Modify: `README.md`
- Modify: `AI_USAGE_AND_VALIDATION.md`
- Modify: `TESTING.md`
- Create: `.env.example`

- [ ] 使用隐藏输入完成扶摇真实端点验证，记录非敏感字段与 request ID。
- [ ] 通过 Sites 原生工具配置 `FUYAO_API_KEY` 运行时密钥。
- [ ] 构建、浏览器验收、重新发布同一私有站点。
