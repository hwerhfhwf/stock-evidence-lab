# 个股多维诊断重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有单问题回答产品重构为按公司类型与用户问题选择维度、区分事实/推断/待验证并可逐项追溯的个股多维诊断产品。

**Architecture:** 保留现有无框架 HTML/CSS/ESM 与同源 Worker 架构。用新的纯函数诊断模型生成“诊断范围—命题—证据—待验证问题”，浏览器只负责渲染和证据钻取；构建脚本继续保证 `ui/`、`dist/` 与 `worker/` 同源。

**Tech Stack:** Node.js test runner、原生 JavaScript ESM、HTML/CSS、Cloudflare Worker 构建产物。

**Spec:** `docs/superpowers/specs/2026-10-28-multidimensional-diagnosis-design.md`

## Global Constraints

- 不增加前端框架或运行时依赖。
- 证据方向只能是 `positive | negative | conflicting | missing`。
- 认知状态只能是 `fact | inference | unverified`，不得与证据方向混用。
- 不输出总分、好坏标签、确定性涨跌预测、目标价或买卖建议。
- 颜色只编码证据方向，且必须同时显示文字标签。
- 数据缺失、冲突、过期或接口失败不得生成正常结论。
- 任何数字结论必须可追溯到来源、时点、单位、口径与原始字段。

## Review Focus

- 未识别公司类型时是否明确降级到通用公司，而不是静默猜行业。
- 累计财务口径是否被误当单季度。
- 同一命题证据冲突时是否保留冲突，而不是多数表决。
- 手机端是否仍能看到优先级、双标签和证据入口。
- 旧的消费化文案和隐性好坏词是否从源文件、构建产物和 Worker 中彻底消失。

---

### Task 1: 多维诊断领域模型

**Files:**
- Create: `ui/diagnosis-model.js`
- Create: `tests/diagnosis-model.test.mjs`
- Modify: `scripts/build-worker.mjs`
- Modify: `worker/index.js`
- Delete after migration: `ui/health-model.js`

**Interfaces:**
- Consumes: 当前 `/api/research` 返回的 `bundle` 与 `{ name, thscode, companyType? }`。
- Produces: `buildDiagnosisReport(bundle, company, question)`；返回 `companyType`、`asOf`、`selectedDimensions`、`summary`、`propositions`、`verificationQuestions`。

- [ ] **Step 1: 写失败测试**，覆盖制造业增长、现金债务、估值、买卖边界、通用公司降级、双字段独立、缺失与冲突。
- [ ] **Step 2: 运行 `node --test tests/diagnosis-model.test.mjs`**，确认因模块或接口不存在而失败。
- [ ] **Step 3: 实现最小纯函数模型**，保证每个命题都有独立 `evidenceDirection`、`epistemicStatus`、`evidenceRefs` 与限制条件。
- [ ] **Step 4: 运行目标测试与 `npm test`**，确认新增模型通过且旧测试失败点只来自待迁移契约。
- [ ] **Step 5: 提交** `feat: add multidimensional diagnosis model`。

### Task 2: 自适应诊断地图界面

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Modify: `tests/live-ui-contract.test.mjs`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `buildDiagnosisReport()`。
- Produces: `renderDiagnosisReport(report)`、命题级证据侧栏与同源 API 交互。

- [ ] **Step 1: 先改页面契约测试**，要求研究任务、诊断范围、诊断摘要、诊断地图、结论依据和待验证问题；同时禁止旧文案。
- [ ] **Step 2: 运行两个 UI 契约测试**，确认因新结构尚不存在而失败。
- [ ] **Step 3: 重写 HTML 与渲染逻辑**；前三个高优先级维度展开，补充维度保留；每个命题显示双标签并可打开专属证据侧栏。
- [ ] **Step 4: 重写 CSS**；使用文字+形状+颜色编码证据方向，加入焦点态、44 px 触控目标、375 px 响应式布局和 `prefers-reduced-motion`。
- [ ] **Step 5: 运行 UI 契约与 `npm test`**，修复所有旧契约迁移问题。
- [ ] **Step 6: 提交** `feat: render adaptive diagnosis map`。

### Task 3: 证据追溯与异常状态

**Files:**
- Modify: `ui/diagnosis-model.js`
- Modify: `ui/app.js`
- Modify: `tests/diagnosis-model.test.mjs`
- Modify: `tests/research.test.mjs`

**Interfaces:**
- Consumes: 原始指标、财务期次、行情序列、模块状态与 request ID。
- Produces: 命题级 `EvidenceItem`、确定性计算说明、来源与口径、缺失/冲突/过期状态。

- [ ] **Step 1: 写失败测试**，覆盖数字事实的字段/单位/期次/来源、累计口径、行情区间与复权、provider failure、stale、conflicting。
- [ ] **Step 2: 运行目标测试**，确认现有模型未满足追溯契约。
- [ ] **Step 3: 实现证据对象与侧栏渲染**；事实与推断分对象，推断只引用已存在事实。
- [ ] **Step 4: 运行目标测试与全量测试**。
- [ ] **Step 5: 提交** `feat: add proposition-level evidence traceability`。

### Task 4: 构建一致性、文档与浏览器验证

**Files:**
- Modify: `scripts/build-worker.mjs`
- Modify: `tests/worker.test.mjs`
- Modify: `README.md`
- Modify: `TESTING.md`
- Modify: `AI_USAGE_AND_VALIDATION.md`
- Regenerate: `dist/*`
- Regenerate: `worker/ui.js`

**Interfaces:**
- Consumes: Task 1–3 的最终源文件。
- Produces: 本地、dist 与 Worker 完全一致的可发布产品。

- [ ] **Step 1: 写失败契约**，要求 Worker 服务新模型、构建产物不含旧文案且版本入口一致。
- [ ] **Step 2: 运行目标测试**，确认旧 Worker 契约失败。
- [ ] **Step 3: 更新构建与文档**，记录 AI 分工、数据边界、测试、已知缺口和启动方式。
- [ ] **Step 4: 运行 `npm test` 与 `npm run build`**。
- [ ] **Step 5: 启动本地 Worker**，用桌面和 375 px 移动视口完成搜索、提问、展开证据、切换区间、失败恢复；截图核对层级和可读性。
- [ ] **Step 6: 提交** `docs: document multidimensional diagnosis product`。

### Task 5: 公开发布检查

**Files:**
- Modify if needed: `.gitignore`
- Verify: tracked files and complete branch history

**Interfaces:**
- Consumes: 已通过测试和浏览器验证的分支。
- Produces: 无密钥、无受限数据的公开 GitHub 仓库。

- [ ] **Step 1: 扫描 API Key、Token、Cookie、个人路径和受限数据**；发现任何命中先移除并重新验证。
- [ ] **Step 2: 检查 `git status`、`git diff --check`、`npm test`、`npm run build`**。
- [ ] **Step 3: 将功能分支合并到 `main`**，确认提交历史与工作树干净。
- [ ] **Step 4: 用已登录账号创建公开仓库并推送 `main`**。
- [ ] **Step 5: 用 GitHub API 复核仓库 `visibility=public`，并从网页读取 README 与关键源码。
