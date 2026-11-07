/**
 * 判断当前页面是否为 AtCoder 页面。
 * 除 atcoder.jp 本站外，脚本也会在 localhost / 127.0.0.1 上运行（用于本地反向代理 / 镜像），
 * 此时通过页面特征确认是 AtCoder，避免影响其它本地页面。
 */
export default function isAtCoderPage(): boolean {
  if (location.hostname === "atcoder.jp") return true;
  const siteName = document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content;
  return siteName === "AtCoder" && document.getElementById("main-div") !== null;
}
