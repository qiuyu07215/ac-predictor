import typescript from "rollup-plugin-typescript";
import html from "rollup-plugin-html";
import scss from 'rollup-plugin-scss';
import json from '@rollup/plugin-json';
import packageJson from "./package.json" with { type: "json" };

const namespace = "https://github.com/qiuyu07215/ac-predictor";
const repository = "https://github.com/qiuyu07215/ac-predictor";
const downloadURL = `${repository}/releases/latest/download/ac-predictor-zh.user.js`;
// 中文版自身的修订号：上游版本号不变时，每次发布中文版都要 +1，油猴才会检测到更新
const zhRevision = 2;
const userScriptVersion = `${packageJson.version}.${zhRevision}`;

// - atcoder.jp 本站
// - 本地反向代理 / 镜像（localhost、127.0.0.1 任意端口）。脚本内部会再检查页面是否为 AtCoder 页面，其它本地页面不受影响。
//   其它域名的镜像站请在油猴脚本设置的「用户匹配」中自行添加。
const userScriptBanner = `
// ==UserScript==
// @name         ${packageJson.name}-zh
// @name:zh-CN   ac-predictor 中文版
// @namespace    ${namespace}
// @version      ${userScriptVersion}
// @description  ${packageJson.description}
// @author       ${packageJson.author}
// @license      ${packageJson.license}
// @homepageURL  ${repository}
// @supportURL   ${repository}/issues
// @updateURL    ${downloadURL}
// @downloadURL  ${downloadURL}
// @match        https://atcoder.jp/*
// @include      /^https?:\\/\\/(localhost|127\\.0\\.0\\.1|\\[::1\\])(:\\d+)?\\/.*$/
// @exclude      /^https?:\\/\\/[^/]+\\/[^#?]*\\/json([?#].*)?$/
// @grant        none
// ==/UserScript==`.trim();

export default [
  {
    input: "src/main.ts",
    output: {
      banner: userScriptBanner,
      file: "dist/userscript/ac-predictor-zh.user.js"
    },
    plugins: [
      html({
        include: "**/*.html"
      }),
      scss({
        output: false
      }),
      json(),
      typescript()
    ]
  }
];
