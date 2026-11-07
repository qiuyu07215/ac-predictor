import { getConfig } from "./config";

/**
 * 内置的 ac-predictor-data 数据源，按顺序尝试。
 * data.ac-predictor.com 是 key-moon/ac-predictor-data 的 GitHub Pages，
 * 后两者是同一仓库的镜像（均返回 Access-Control-Allow-Origin: *）。
 * jsDelivr 对分支有最长约 12 小时的缓存，因此放在最后。
 */
export const BUILTIN_DATA_SOURCES = [
  "https://data.ac-predictor.com/",
  "https://raw.githubusercontent.com/key-moon/ac-predictor-data/master/",
  "https://cdn.jsdelivr.net/gh/key-moon/ac-predictor-data@master/",
];

const PREFERRED_SOURCE_KEY = "ac-predictor-preferred-data-source";

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function isValidDataSourceUrl(url: string): boolean {
  const normalized = normalizeBaseUrl(url);
  if (normalized === "") return true;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }
  catch {
    return false;
  }
}

function getPreferredSource(): string | null {
  try {
    return sessionStorage.getItem(PREFERRED_SOURCE_KEY);
  }
  catch {
    return null;
  }
}

function setPreferredSource(source: string) {
  try {
    sessionStorage.setItem(PREFERRED_SOURCE_KEY, source);
  }
  catch {
    // ignore
  }
}

function getDataSources(): string[] {
  const custom = normalizeBaseUrl(getConfig("dataSourceUrl") ?? "");
  const sources = [...BUILTIN_DATA_SOURCES];
  // 上次成功的内置数据源优先，避免每次都等待已知不可用的数据源超时
  const preferred = getPreferredSource();
  if (preferred && sources.includes(preferred)) {
    sources.splice(sources.indexOf(preferred), 1);
    sources.unshift(preferred);
  }
  if (custom !== "" && isValidDataSourceUrl(custom)) {
    return [custom, ...sources.filter(x => x !== custom)];
  }
  return sources;
}

function getTimeoutMs(): number {
  const timeout = Number(getConfig("requestTimeout"));
  if (!isFinite(timeout) || timeout <= 0) return 8000;
  return Math.min(timeout, 120) * 1000;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  }
  catch (e) {
    if (controller.signal.aborted) {
      throw new Error(`timeout after ${timeoutMs / 1000}s: ${url}`);
    }
    throw e;
  }
  finally {
    clearTimeout(timer);
  }
}

export class NotFoundError extends Error {}

/**
 * 从 ac-predictor-data 获取 JSON。
 * 依次尝试自定义数据源与内置数据源：网络错误、超时、5xx 时切换到下一个；
 * 404 视为数据确实不存在（例如 aperf 尚未生成），直接抛出 NotFoundError。
 */
export async function fetchDataJson<T = unknown>(path: string): Promise<T> {
  const relativePath = path.replace(/^\/+/, "");
  const timeoutMs = getTimeoutMs();
  const errors: string[] = [];
  for (const source of getDataSources()) {
    const url = source + relativePath;
    try {
      // 不携带 cookie，避免跨域预检/凭据问题；cache: "no-cache" 让浏览器向代理/源站重新验证
      const response = await fetchWithTimeout(url, { credentials: "omit", cache: "no-cache" }, timeoutMs);
      if (response.status === 404) {
        throw new NotFoundError(`${response.status} ${url}`);
      }
      if (!response.ok) {
        errors.push(`${response.status} ${url}`);
        continue;
      }
      const json = await response.json();
      if (BUILTIN_DATA_SOURCES.includes(source)) setPreferredSource(source);
      return json as T;
    }
    catch (e) {
      if (e instanceof NotFoundError) throw e;
      errors.push(`${(e as Error)?.message ?? e} (${url})`);
      console.warn(`[ac-predictor] data source failed, trying next one: ${url}`, e);
    }
  }
  throw new Error(`all data sources failed:\n${errors.join("\n")}`);
}

/**
 * AtCoder 自身的接口一律使用与当前页面同源的相对地址，
 * 这样通过反向代理 / 镜像站（例如 http://127.0.0.1:xxxx/ 转发 atcoder.jp）访问时也能正常工作，
 * 并且会自动携带当前站点的登录 cookie。
 */
export async function fetchAtCoderJson<T = unknown>(path: string): Promise<T> {
  const url = new URL(path, location.origin).toString();
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return await response.json() as T;
}

/**
 * jQuery ajax 的 settings.url 可能是相对路径，也可能是（经代理改写后的）绝对地址。
 * 同源时统一转换为 "pathname + search"，以便与各处理器中的正则匹配。
 */
export function toRelativeUrl(url: string): string {
  try {
    const parsed = new URL(url, location.href);
    if (parsed.origin !== location.origin) return url;
    return parsed.pathname + parsed.search;
  }
  catch {
    return url;
  }
}
