const configKey = "ac-predictor-config";

export type Language = "auto" | "zh" | "ja" | "en";

type Config = {
  useResults: boolean,
  hideDuringContest: boolean
  isDebug: boolean,
  hideUntilFixed: boolean,
  useFinalResultOnVirtual: boolean,
  compareComputations: boolean,
  language: Language,
  /** ac-predictor-data のミラー / ローカルプロキシのベース URL。空文字なら組み込みのデータソースのみ使う */
  dataSourceUrl: string,
  /** データソース 1 つあたりのタイムアウト (秒) */
  requestTimeout: number,
};

const defaultConfig: Config = {
  useResults: true,
  hideDuringContest: false,
  isDebug: false,
  hideUntilFixed: false,
  useFinalResultOnVirtual: false,
  compareComputations: false,
  language: "zh",
  dataSourceUrl: "",
  requestTimeout: 8,
};

function getConfigObj(): Config {
  let val: string;
  try {
    val = localStorage.getItem(configKey) ?? "{}";
  }
  catch {
    val = "{}";
  }
  let config;
  try {
    config = JSON.parse(val);
  }
  catch {
    console.warn("invalid config found", val);
    config = {};
  }
  return { ...defaultConfig, ...config };
}

function storeConfigObj(config: Config) {
  try {
    localStorage.setItem(configKey, JSON.stringify(config));
  }
  catch (e) {
    console.warn("failed to store config", e);
  }
}

export function getConfig<KeyT extends (keyof Config)>(key: KeyT): Config[KeyT] {
  return getConfigObj()[key];
}

export function setConfig<KeyT extends (keyof Config)>(key: KeyT, value: Config[KeyT]) {
  const config = getConfigObj();
  config[key] = value;
  storeConfigObj(config);
}
