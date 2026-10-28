# Stock Evidence Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可部署的美的集团多维诊断与证据验证 Web 产品。

**Architecture:** 静态 ES Modules 应用，金融计算与 UI 解耦；真实公开数据以带来源的快照提供，数据适配器可替换。异常模式由同一诊断引擎显式返回。

**Tech Stack:** HTML5、CSS3、JavaScript ES Modules、Node.js built-in test runner

**Spec:** `docs/superpowers/specs/2026-10-28-stock-evidence-lab-design.md`

## Global Constraints

- 不输出买卖建议、目标价或确定性涨跌预测。
- 每个关键数字包含时点、单位、来源和口径。
- 数据缺失、冲突、过期或接口失败不得静默转成正常结论。
- 零运行时依赖，适合静态托管。

## Review Focus

- 缺少关键字段时返回 unknown，而不是 0 或 neutral。
- 接口失败时保留最后可验证快照，并显示失败状态。
- 同一指标存在正负两面时保留 contradiction。
- 用户问题无法映射维度时使用全景诊断且明确路由结果。
- 金额单位与同比百分比不得混淆。

---

### Task 1: 诊断引擎

**Files:**
- Create: `src/engine.mjs`
- Test: `tests/engine.test.mjs`

**Interfaces:**
- Produces: `percentChange(current, previous)`, `classifyEvidence(input)`, `routeQuestion(question)`, `buildDiagnostics(snapshot, mode)`

- [ ] 写失败测试，覆盖同比计算、证据分类、问题路由、字段缺失和接口失败。
- [ ] 运行 `node --test tests/engine.test.mjs` 并确认因模块缺失失败。
- [ ] 实现最小诊断引擎。
- [ ] 重跑测试并确认通过。

### Task 2: 真实数据快照与可追溯模型

**Files:**
- Create: `src/data.mjs`
- Test: `tests/data.test.mjs`

**Interfaces:**
- Produces: `mideaSnapshot`, `sourceRegistry`
- Consumes: 2025 年报、2026 半年报公开字段与链接。

- [ ] 写失败测试，要求关键字段具备值、期次、单位、来源 ID。
- [ ] 运行测试并确认失败。
- [ ] 写入真实数据快照和来源注册表。
- [ ] 重跑测试并确认通过。

### Task 3: 交互式诊断界面

**Files:**
- Create: `dist/index.html`
- Create: `dist/styles.css`
- Create: `dist/app.mjs`
- Create: `dist/engine.mjs`
- Create: `dist/data.mjs`
- Test: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `buildDiagnostics`, `routeQuestion`, `mideaSnapshot`
- Produces: 问题路由、证据过滤、诊断卡、证据抽屉、异常模式切换。

- [ ] 写 UI 合同失败测试。
- [ ] 运行测试并确认失败。
- [ ] 实现响应式页面与交互。
- [ ] 运行完整测试。

### Task 4: 交付文档与部署

**Files:**
- Create: `README.md`
- Create: `AI_USAGE_AND_VALIDATION.md`
- Create: `TESTING.md`

- [ ] 记录产品选择、AI 分工、数据源、边界、启动方式与已知阻碍。
- [ ] 运行静态服务器，检查 HTTP 200 和浏览器主链路。
- [ ] 打包并发布私有预览站点。

