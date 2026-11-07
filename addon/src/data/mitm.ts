import { toRelativeUrl } from "../util/request";

type Handler = (body: string, path: string) => undefined;

const handlers: Handler[] = [];

export function addHandler(handler: Handler) {
  handlers.push(handler);
}

// absurd hack to steal ajax response data for caching
// 仅在 AtCoder 页面（存在 jQuery）时挂载；脚本也会在 localhost 等本地页面加载
// @ts-ignore
if (typeof $ !== "undefined") $(document).on("ajaxComplete", (_, xhr: any, settings: any) => {
  if (xhr.status == 200) {
    for (const handler of handlers) {
      handler(xhr.responseText, toRelativeUrl(settings.url));
    }
  }
});
