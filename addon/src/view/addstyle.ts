import isAtCoderPage from "../parse/isAtCoderPage";

export default function addStyle(styleSheet: string) {
  // 脚本也会在 localhost 等本地页面加载，非 AtCoder 页面不注入样式
  if (!isAtCoderPage()) return;
  const styleElem = document.createElement("style");
  styleElem.textContent = styleSheet;
  document.getElementsByTagName("head")[0].append(styleElem);
}
