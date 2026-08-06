# 股息雷达 · Dividend Radar

面向 A 股稳定分红股票的持仓与股息跟踪工具。它把基本面门槛、月线风险、周线 BOLL 位置和日线执行确认放在同一个看板里，帮助投资者核对股息和交易记录。

**在线体验：** [a-share-dividend-radar.liyaowang517.chatgpt.site](https://a-share-dividend-radar.liyaowang517.chatgpt.site/)

## 主要功能

- 自定义股票池，查看实时股价、年度股息率、周线 BOLL 和 MA250
- 合并完整财年、中期及年度现金分红，支持跨年和多次分红
- 录入买入、卖出日期与份额，按登记日持仓核算预计与已收到股息
- 展示股息发放进度、贡献率、月度明细和未来 30 天分红
- 根据月线风险开关、周线位置和日线确认给出网格执行提示
- 支持导出和导入个人数据，便于定期备份

## 隐私与数据

个人持仓和交易记录不包含在本仓库中。网站按用户身份隔离投资数据；请勿把账号、交易记录或 API 密钥提交到 GitHub。股息、税费和行情结果仅供核对，最终以公司公告、中国结算及券商结算为准。

## 本地运行

需要 Node.js `>=22.13.0`：

```bash
npm install
npm run dev
```

构建和测试：

```bash
npm run build
npm test
```

本仓库是公开源码版，未包含仅供线上部署使用的内部 Sites 配置和生成产物。若要部署到自己的环境，请根据运行平台补充数据库绑定和行情接口环境变量。

## English summary

Dividend Radar is an A-share dividend and portfolio tracker. It combines dividend history, ex-dividend-date holdings, monthly risk signals, weekly Bollinger Bands, MA250, and grid-execution hints in one dashboard. Personal investment records are not part of this repository.

## 风险提示

本项目不构成投资建议。行情、分红、税费和技术指标可能存在延迟或口径差异，请以官方公告和券商实际数据为准。

## License

MIT License. See [LICENSE](./LICENSE).
