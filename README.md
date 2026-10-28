# FinScope

FinScope 是一个可操作的 AI Native A 股公司研究工作台。它把公司与业务、经营与盈利、财务与现金、估值、行情、行业位置及事件风险组织成一条连续研究链；用户看到的是数据关系、证据方向和待验证变量，不是“好 / 坏”标签或买卖建议。

- Web 产品：[stock-evidence-lab-midea.violet-lotus-6432.chatgpt.site](https://stock-evidence-lab-midea.violet-lotus-6432.chatgpt.site)
- 公共源码：[github.com/hwerhfhwf/stock-evidence-lab](https://github.com/hwerhfhwf/stock-evidence-lab)

![FinScope 桌面版研究工作台](docs/finscope-desktop.png)

## 产品价值

- 搜索 A 股名称或代码，实时重建该公司的完整研究画布，不复用上一家公司的内容。
- 首屏同时看到公司业务、最新行情、收入构成、经营趋势和关键指标。
- 收入、利润、经营现金和资产负债按相邻关系呈现，减少孤立数字。
- PE、PB、PS、PCF 保留原口径和缺失值，不把 `null` 显示成 0。
- 区分客观事实、分析推断与暂无法验证的信息；正面、负面、指标方向分化和未知证据绑定到具体命题。
- 从命题钻取至财务期次、行情区间、同行比较或待验证问题，并继续查看原字段、单位、口径、时点和来源链接。
- 连接任意 OpenAI 兼容模型后，模型只编排研究维度、证据关系与白名单图表；确定性数值仍由程序计算并经结构校验。
- 简明与专业模式共用事实；专业模式只增加原值和口径细节。

## 数据架构

采用“**扶摇主数据 + iFinD 可选增强**”的架构：

- 扶摇提供公司搜索、A 股行情快照、前复权历史 K 线、三张财务报表、财务指标和最新估值。
- 东方财富 F10 补充公司概况与行业文本，来源在公司模块单独标注，不与扶摇财务字段混用。
- iFinD 可选增强新闻、政策、宏观及跨市场语境。当前代码保留服务端边界；未配置时只让事件语境模块降级，不影响扶摇模块。
- 比亚迪 2025 年分产品收入来自公开年报，因为当前扶摇 bundle 不含分部收入。实时服务失败时，页面明确切换为“**公开披露快照**”，不冒充实时行情。
- 任一数据源失败都按**模块级降级**处理：已成功模块继续展示，失败模块显示具体原因。

浏览器只调用同源接口：

```text
GET /api/search?q=比亚迪
GET /api/research?thscode=002594.SZ&name=比亚迪
```

服务端返回 `profile`、`market`、`financials`、`indicators`、`valuation`、`industry`、`context` 七个独立状态。缺失、过期或接口失败的信息不补零、不生成正常结论。

## AI Native 研究协议

默认工作台无需模型即可完成确定性计算、证据分组与钻取。用户可在页面中临时输入 OpenAI 兼容的 `endpoint + model + apiKey`，请求经同源 Worker 转发；密钥不写入浏览器存储、仓库或日志。

模型接收标准化 `SourcePackage`，输出受约束的 `ResearchClaim` 与 `ChartSpec`：

- 事实只能引用 SourcePackage 中已有字段；模型不能提交替代数值或任意代码。
- `fact | inference | unverified` 与 `positive | negative | conflicting | unknown` 分别表达认知状态和证据方向。
- 图表类型、字段引用和来源引用均使用白名单校验；校验失败时保留默认研究。
- 模型结果先预览，用户应用后仍可撤销；换股时模型草稿和自定义图表全部清空。
- AI 或外部数据不可用时，仅对应能力降级，确定性研究画布继续工作。

## 本地运行

需要 Node.js 18+：

```powershell
npm test
npm run build
npm run serve
```

打开 `http://127.0.0.1:4173/`。未配置密钥时仍可查看明确标注的比亚迪披露快照。

如需扶摇实时数据，只在服务端环境设置：

```powershell
$env:FUYAO_API_KEY = '在本地会话或部署平台设置'
npm run serve
```

`FUYAO_API_KEY` 仅由 Worker 读取，不进入浏览器脚本、构建产物或接口响应。iFinD 的账户专属 MCP 配置也必须留在服务端；仓库不包含密钥或生成配置。

## 代码结构

- `worker/fuyao.js`：扶摇允许列表、输入校验、请求与错误规范化。
- `worker/research.js`：研究 bundle、行情指标和模块级降级。
- `worker/company-profile.js`：公司概况的受限服务端适配器。
- `worker/ifind.js`：iFinD 可选服务端边界。
- `worker/ai.js`：OpenAI 兼容 Provider 适配层、端点校验与安全错误。
- `ui/data-client.js`：浏览器同源数据客户端。
- `ui/research-view.js`：纯函数视图模型、累计报表单季换算及披露后备。
- `ui/research-protocol.js`：SourcePackage、ResearchClaim、维度选择与证据约束。
- `ui/ai-adapter.js`：模型结果解析、ChartSpec 白名单和来源校验。
- `ui/app.js`：搜索、换股重建、图表、证据抽屉、报告风险图和 AI 预览/撤销。
- `ui/finscope-data.js`：比亚迪公开披露快照及页码级证据。
- `tests/`：计算、来源、缺失状态、接口安全、UI、文档与发布契约。

## 验证

```powershell
npm test
npm run build
```

测试覆盖搜索编码、密钥隔离、部分上游失败、估值空值、累计报表单季换算、图表缺失值、证据回溯、四类证据、四类钻取、AI 结构校验、换股隔离、响应式与发布物一致性。详细架构见 [docs/live-data-architecture.md](docs/live-data-architecture.md)，产品交付说明见 [docs/product-handoff.md](docs/product-handoff.md)。

## 已知边界

- 当前扶摇接口只提供最新估值快照，未提供历史估值分位。
- 公司行业文本已接入，但同日同口径同行样本尚未完成，因此不生成行业排名。
- iFinD 需要账户侧生成的 MCP 配置；未配置时不伪造新闻或政策影响。
- 分部收入仅在有公开披露快照的公司展示；其他公司明确显示缺失。
- 合并财报不能单独识别价格、销量和产品结构对收入的独立贡献。

FinScope 仅作研究辅助，不构成投资建议。
