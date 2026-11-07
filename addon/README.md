# addon

## 构建

```
pnpm install
pnpm bundle
```

产物位于 `dist/userscript/ac-predictor-zh.user.js`。

> pnpm / npm 会读取环境变量 `HTTP_PROXY` / `HTTPS_PROXY`，如果安装依赖时网络不通，可先设置为本地代理，例如
> `HTTPS_PROXY=http://127.0.0.1:7890 pnpm install`。

## 测试

```
pnpm test
```

## 开发

让油猴从本地构建产物加载：
```js
// ==UserScript==
// @name        ac-predictor-zh-dev
// @namespace   https://github.com/qiuyu07215/ac-predictor
// @version     0.0.0
// @author      keymoon
// @license     MIT
// @require     file:///path/to/ac-predictor/addon/dist/userscript/ac-predictor-zh.user.js
// @match       https://atcoder.jp/*
// @exclude     https://atcoder.jp/*/json
// ==/UserScript==
```

## 翻译

界面文案位于 `src/i18n/data/{zh,ja,en}.json`，三个文件的键需保持一致；默认语言为中文（`src/util/config.ts` 中的 `language`）。

## 网络请求

所有网络请求集中在 `src/util/request.ts`：

- `fetchAtCoderJson(path)`：请求 AtCoder 接口，使用当前页面同源地址（兼容反向代理 / 镜像）。
- `fetchDataJson(path)`：请求 ac-predictor-data，依次尝试自定义数据源与内置数据源；网络错误、超时、5xx 时自动切换，404 视为数据不存在。
