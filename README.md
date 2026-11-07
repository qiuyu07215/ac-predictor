# ac-predictor 中文版

在 AtCoder 比赛进行中，于榜单页实时显示每位选手的**预测表现分（performance）**和 **Rating 变化**。

本仓库 fork 自 [key-moon/ac-predictor](https://github.com/key-moon/ac-predictor)，在原版基础上：

- **汉化**：界面默认简体中文，可在设置中切换为日语 / 英语 / 跟随 AtCoder 页面语言。
- **兼容本地代理 / 镜像**：
  - AtCoder 接口一律使用当前页面的同源地址，通过本地反向代理或镜像站（如 `http://127.0.0.1:端口/`）访问 AtCoder 时也能正常工作；
  - 预测数据（aperf、比赛信息）支持多数据源自动回退：`data.ac-predictor.com` → `raw.githubusercontent.com` → `cdn.jsdelivr.net`，单个数据源超时即切换；
  - 可在设置中填写自定义数据源地址与超时时间。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)。
2. **先停用/卸载原版 ac-predictor**，否则榜单会出现两组重复的列。
3. 安装脚本：打开 [Releases](https://github.com/qiuyu07215/ac-predictor/releases/latest) 中的 `ac-predictor-zh.user.js`，或按 [addon/README.md](addon/README.md) 自行构建。

安装后在 AtCoder 右上角用户菜单中点击「ac-predictor 设置」即可调整选项。

## 上游数据缺失时的处理

预测依赖上游 `ac-predictor-data` 提供的 aperf（参赛者平均表现分）和比赛信息。上游停止更新或网络不通时：

- **比赛信息**不在上游列表中 → 改为解析 AtCoder 比赛首页（开始/结束时间、Rated 范围、比赛类型）。
- **aperf** 取不到 → 根据榜单中每位选手赛前的 Rating 与参赛次数推算，并在榜单上方显示黄色提示。
  用历史比赛实测：算法赛与正常预测平均相差约 10～15 分；启发式赛（AHC）平均相差约 50 分。
- 其它加载失败会在榜单上方以红色提示显示具体原因，而不是只在单元格里显示内部错误。

## 关于代理

| 场景 | 需要做什么 |
| --- | --- |
| 使用 Clash / v2rayN 等**系统代理或浏览器代理**访问 atcoder.jp | 无需任何设置，脚本的请求会自动走浏览器代理。若 `data.ac-predictor.com` 较慢，脚本会自动切换到其它数据源；也可在设置中调大超时。 |
| 通过 `localhost` / `127.0.0.1` 上的**反向代理**访问 AtCoder | 无需设置，脚本已匹配本地地址，并会检测页面是否为 AtCoder 页面后才运行。 |
| 通过其它域名的**镜像站**访问 AtCoder | 在油猴脚本设置 →「用户匹配（User matches）」中添加该域名，例如 `https://atcoder.example.com/*`。 |
| 自建了 `ac-predictor-data` 的镜像 | 在「ac-predictor 设置 → 网络 / 代理 → 自定义数据源地址」中填写其根地址，例如 `http://127.0.0.1:8080/`。 |

> 注意：「自定义数据源地址」需要填写能直接返回数据文件（如 `contest-details.json`）的地址，**不是** Clash 等 HTTP 代理的端口。

## 目录

- [/addon](addon)：用户脚本源码
- [/crawler](crawler)：数据收集程序源码（上游维护，本 fork 未改动）
- [/website](website)：上游网站源码（本 fork 未改动）

## 许可证

MIT，原作者 [keymoon](https://github.com/key-moon)。
