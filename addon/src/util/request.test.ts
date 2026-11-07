import { BUILTIN_DATA_SOURCES, fetchAtCoderJson, fetchDataJson, isValidDataSourceUrl, NotFoundError, toRelativeUrl } from "./request";

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: 200 <= status && status < 300, status, json: async () => body } as Response;
}

let fetchMock: jest.Mock;

beforeEach(() => {
  // @ts-ignore
  globalThis.localStorage = createStorage();
  // @ts-ignore
  globalThis.sessionStorage = createStorage();
  // @ts-ignore
  globalThis.location = new URL("http://127.0.0.1:8080/contests/abc400/standings");
  fetchMock = jest.fn();
  // @ts-ignore
  globalThis.fetch = fetchMock;
});

describe("fetchDataJson", () => {
  test("uses the first built-in source when it works", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ a: 1 }));
    await expect(fetchDataJson("aperfs/abc400.json")).resolves.toEqual({ a: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BUILTIN_DATA_SOURCES[0]}aperfs/abc400.json`);
  });

  test("falls back to the next source on network error and remembers it", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse([1, 2]));
    await expect(fetchDataJson("contest-details.json")).resolves.toEqual([1, 2]);
    expect(fetchMock.mock.calls[1][0]).toBe(`${BUILTIN_DATA_SOURCES[1]}contest-details.json`);

    fetchMock.mockResolvedValueOnce(jsonResponse([3]));
    await fetchDataJson("contest-details.json");
    expect(fetchMock.mock.calls[2][0]).toBe(`${BUILTIN_DATA_SOURCES[1]}contest-details.json`);
  });

  test("falls back on 5xx", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(null, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(fetchDataJson("x.json")).resolves.toEqual({ ok: true });
  });

  test("404 is treated as not found without trying other sources", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 404));
    await expect(fetchDataJson("aperfs/none.json")).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("throws after all sources failed", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchDataJson("x.json")).rejects.toThrow("all data sources failed");
    expect(fetchMock).toHaveBeenCalledTimes(BUILTIN_DATA_SOURCES.length);
  });

  test("custom data source is tried first and a trailing slash is added", async () => {
    localStorage.setItem("ac-predictor-config", JSON.stringify({ dataSourceUrl: "http://127.0.0.1:9000/data" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await fetchDataJson("/contest-details.json");
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:9000/data/contest-details.json");
  });

  test("times out a hanging source and moves on", async () => {
    localStorage.setItem("ac-predictor-config", JSON.stringify({ requestTimeout: 0.05 }));
    fetchMock
      .mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_, reject) => {
        init.signal!.addEventListener("abort", () => reject(new Error("aborted")));
      }))
      .mockResolvedValueOnce(jsonResponse({ late: false }));
    await expect(fetchDataJson("x.json")).resolves.toEqual({ late: false });
  });
});

describe("fetchAtCoderJson", () => {
  test("requests the current origin (works behind reverse proxies)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await fetchAtCoderJson("/contests/abc400/standings/json");
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8080/contests/abc400/standings/json");
  });
});

describe("helpers", () => {
  test("isValidDataSourceUrl", () => {
    expect(isValidDataSourceUrl("")).toBe(true);
    expect(isValidDataSourceUrl("https://example.com/data/")).toBe(true);
    expect(isValidDataSourceUrl("127.0.0.1:7897")).toBe(false);
    expect(isValidDataSourceUrl("socks5://127.0.0.1:7897")).toBe(false);
  });

  test("toRelativeUrl", () => {
    expect(toRelativeUrl("/contests/abc400/standings/json")).toBe("/contests/abc400/standings/json");
    expect(toRelativeUrl("http://127.0.0.1:8080/contests/abc400/standings/virtual/json?showGhost=true")).toBe("/contests/abc400/standings/virtual/json?showGhost=true");
    expect(toRelativeUrl("https://other.example/contests/abc400/standings/json")).toBe("https://other.example/contests/abc400/standings/json");
  });
});
