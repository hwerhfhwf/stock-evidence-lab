# 一分钟公司体检 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有数据工作台重构为普通投资者一分钟读完的连续公司体检。

**Architecture:** 保留 Worker 与扶摇聚合层，新增前端体检视图模型，将现有数据转换为五步通俗叙事。单页主线承载摘要与解释，专业图表、财务表和血缘收进证据层。

**Tech Stack:** 原生 HTML、CSS、ES modules、Node test runner、Cloudflare Worker

**Spec:** `docs/superpowers/specs/2026-10-28-one-minute-health-check-design.md`

## Global Constraints

- 不增加运行时依赖，不改变扶摇接口和服务端 Secret。
- 不输出综合分、买卖建议或目标价。
- 缺失数据保持未知，模块失败局部降级。
- 面向用户的主层不直接展示英文指标 ID。

## Review Focus

- 指标缺失时摘要与步骤仍能组成完整阅读路径。
- 部分上游失败时不生成虚假状态或行动建议。
- 手机窄屏保持步骤顺序、连接线和可点击目标。
- 专业证据展开后仍能返回体检主线。
- 状态语言不构成投资建议。

---

### Task 1: 体检叙事模型

**Files:**
- Create: `ui/health-model.js`
- Create: `tests/health-model.test.mjs`

**Interfaces:**
- Consumes: 现有 `/api/research` bundle。
- Produces: `buildHealthReport(bundle, company)`，返回 summary、counts、steps、actions。

- [ ] 写失败测试：五步顺序、中文状态、入门解释、缺失指标与部分失败。
- [ ] 运行 `node --test tests/health-model.test.mjs`，确认因模块不存在而失败。
- [ ] 实现最小体检视图模型。
- [ ] 再运行测试，确认通过。

### Task 2: 单页体检体验

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Modify: `tests/live-ui-contract.test.mjs`

**Interfaces:**
- Consumes: `buildHealthReport`。
- Produces: 摘要、五步路线、行动清单与专业证据抽屉。

- [ ] 先修改合同测试，要求一分钟入口、连续五步、为什么解释、下一步行动、专业证据第二层。
- [ ] 运行合同测试并确认旧页面失败。
- [ ] 重写页面结构、渲染和响应式样式。
- [ ] 运行合同测试与完整 `npm test`，确认通过。

### Task 3: 浏览器验收与发布

**Files:**
- Modify: `README.md`
- Generated: `worker/ui.js`, `dist/server/*`

**Interfaces:**
- Consumes: 完成的体检页面。
- Produces: 原站点新的私有生产版本。

- [ ] 构建并检查密钥泄漏。
- [ ] 用真实美的、贵州茅台数据验收主线、展开和窄屏。
- [ ] 推送源码、打包 Worker 并部署原站点。
- [ ] 确认 Sites 返回 succeeded 与生产 URL。
