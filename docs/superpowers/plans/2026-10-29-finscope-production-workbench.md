# FinScope Production Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前原型改造成可公开访问、可实际操作、证据可下钻的比亚迪多维研究工作台。

**Architecture:** 保留既有 Worker、扶摇适配器与 `diagnosis-model.js` 的证据路由，将比亚迪披露快照作为无密钥时可完整操作的演示数据。新增独立的快照/派生指标模块，UI 仅消费结构化事实、计算和证据对象；实时行情、同行和估值缺失在对应模块局部呈现。

**Tech Stack:** 原生 HTML、CSS、ES modules、Cloudflare Worker、Node.js built-in test runner、OpenAI Sites。

**Spec:** `../03_个股多维诊断与证据验证.md`

## Global Constraints

- 页面是个股研究工具，不是产品说明书、金融教程或开发汇报。
- 保留公司与业务 → 企业基本面 → 估值与预期 → 市场表现的研究关系；利润拆解只作为经营分析工具。
- 正面、负面、矛盾、未知是具体判断的属性，不建立四个等量证据框。
- 事实、推断和暂时无法验证的信息必须分离；缺失不得包装成正常结果。
- 来源、原值、计算、报告页码和限制必须绑定到具体判断。
- 简明与专业模式共用同一事实和判断，只改变展示深度。
- 不使用 Humanizer；不输出评分、目标价、确定性预测或买卖建议。
- 默认页面必须在未配置 `FUYAO_API_KEY` 时仍可完整研究比亚迪快照。
- 视觉匹配当前 `workbench-v2.html` 的深色高密度终端风格，但正文不小于 12px、移动端输入不小于 16px，并满足键盘与对比度要求。

## Review Focus

- 2026H1 同比方向：营业收入应为下降，归母利润下降，经营现金上升；错误的年份映射不得再次出现。
- 无行情/同业/同日估值时：模块局部显示未知，不生成示意价格、排名或估值高低。
- 用户研究问题：应改变维度优先级和页面聚焦，但不能改变或隐藏基础事实与风险。
- 简明/专业切换：证据结论必须一致，专业模式只能增加原值、口径和公式。
- 小屏与键盘：不得横向溢出；抽屉可用 Escape 关闭并恢复焦点。

---

### Task 1: 比亚迪快照与确定性派生指标

**Files:**
- Create: `ui/finscope-data.js`
- Create: `tests/finscope-data.test.mjs`
- Modify: `scripts/build-worker.mjs`
- Modify: `worker/index.js`

**Interfaces:**
- Produces: `BYD_SNAPSHOT`, `createBydDemoBundle()`, `deriveBydResearch()`；后两项分别返回现有 `buildWorkbench` 可消费的 bundle 与 UI 可消费的派生指标。
- Consumes: `ui/diagnosis-model.js` 的 bundle 字段约定。

- [ ] **Step 1: Write the failing tests**

在 `tests/finscope-data.test.mjs` 断言：2026H1 收入同比约 `-7.13%`、归母利润同比约 `-20.54%`、经营现金同比约 `+17.28%`、TTM 归母利润约 `305.78` 亿元；每个判断包含来源 ID、页码、期次和原始值；演示 bundle 的市场模块保持不可用。

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/finscope-data.test.mjs`
Expected: FAIL because `ui/finscope-data.js` does not exist.

- [ ] **Step 3: Implement the data module and build routes**

创建结构化比亚迪快照与纯派生函数；构建脚本将模块复制到 `dist/` 并写入 Worker UI 模块；Worker 提供 `/finscope-data.js` 同源模块。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/finscope-data.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/finscope-data.js tests/finscope-data.test.mjs scripts/build-worker.mjs worker/index.js
git commit -m "feat: add traceable BYD research snapshot"
```

### Task 2: 高密度研究工作台与证据交互

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/live-ui-contract.test.mjs`
- Modify: `tests/workbench.test.mjs`

**Interfaces:**
- Consumes: `deriveBydResearch()`、`createBydDemoBundle()` 与 `buildWorkbench(bundle, company, question)`。
- Produces: 锚点式研究结构、简明/专业模式、期间切换、研究问题路由、命题级证据抽屉、局部未知状态和移动端导航。

- [ ] **Step 1: Write failing UI and model contract tests**

断言正式页面包含公司与业务、经营与盈利、财务与现金、估值与预期、市场表现、事件与风险、证据抽屉和研究问题入口；断言删除“当前重点”“证据怎么读”“一分钟读懂”“如何读这份体检”等自述；断言专业模式不改变事实数据；断言 Escape/焦点恢复、可见 focus、移动断点和 reduced-motion 契约。

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/ui-contract.test.mjs tests/live-ui-contract.test.mjs tests/workbench.test.mjs`
Expected: FAIL against the current checkup UI and old IDs/copy.

- [ ] **Step 3: Implement the production workbench**

按 v2 参考稿的侧栏、顶部研究框和分层面板实现；用 SVG 柱形/折线/瀑布与直接数值标签承担数据表达，图表附可见表格替代；研究问题只改变优先级与滚动焦点；所有判断按钮打开与其直接相关的证据记录。

- [ ] **Step 4: Run focused and full suites**

Run: `node --test tests/ui-contract.test.mjs tests/live-ui-contract.test.mjs tests/workbench.test.mjs`
Expected: PASS.

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/index.html ui/app.js ui/styles.css tests/ui-contract.test.mjs tests/live-ui-contract.test.mjs tests/workbench.test.mjs worker/ui.js dist
git commit -m "feat: rebuild FinScope research workbench"
```

### Task 3: 文档、浏览器验收与公开交付

**Files:**
- Modify: `README.md`
- Modify: `AI_USAGE_AND_VALIDATION.md`
- Modify: `TESTING.md`
- Create: `docs/finscope-desktop.png`

**Interfaces:**
- Consumes: Task 2 的生产构建。
- Produces: 可复现启动说明、AI/确定性计算边界、测试记录、公开 GitHub 仓库和公开 Web URL。

- [ ] **Step 1: Update documentation from verified behavior**

README 写明产品价值、研究链路、数据来源、默认演示、服务端密钥、已知边界、仓库和 Web URL；AI 记录明确人机分工及本轮修正的错误；测试说明列出命令和边界场景。

- [ ] **Step 2: Run build and source checks**

Run: `npm run build`
Expected: exit 0 and Worker artifact validation passes.

Run: `git diff --check`
Expected: exit 0.

- [ ] **Step 3: Browser verification**

在 1440、1024、768、375 及 320px 检查布局；操作期间切换、简明/专业、研究问题、证据抽屉、Escape 与移动导航；确认无控制台错误、无横向溢出，保存桌面截图。

- [ ] **Step 4: Publish and verify**

推送 GitHub `main`；同步现有 Sites 项目、将访问权限设为 `public`、保存并部署；以部署状态返回的 URL 作为交付 URL。

- [ ] **Step 5: Commit documentation and delivery metadata**

```bash
git add README.md AI_USAGE_AND_VALIDATION.md TESTING.md docs/finscope-desktop.png .openai/hosting.json
git commit -m "docs: document FinScope product and validation"
```

