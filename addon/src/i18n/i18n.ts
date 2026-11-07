import zhJson from "./data/zh.json";
import jaJson from "./data/ja.json";
import enJson from "./data/en.json";
import { getConfig } from "../util/config";

type TranslationKey = keyof typeof zhJson;
type Translation = Record<TranslationKey, string>;

const translations: { [lang in "ZH" | "JA" | "EN"]: Translation } = { "ZH": zhJson, "JA": jaJson, "EN": enJson };

// should not be here
function getAtCoderLanguage(): "JA" | "EN" {
  const elems = document.querySelectorAll("#navbar-collapse .dropdown > a");
  if (elems.length == 0) return "JA";
  for (let i = 0; i < elems.length; i++) {
    if (elems[i].textContent?.includes("English")) return "EN";
    if (elems[i].textContent?.includes("日本語")) return "JA";
  }
  console.warn("language detection failed. fallback to English");
  return "EN";
}

function getCurrentLanguage(): "ZH" | "JA" | "EN" {
  const configured = getConfig("language");
  if (configured === "zh") return "ZH";
  if (configured === "ja") return "JA";
  if (configured === "en") return "EN";
  return getAtCoderLanguage();
}

const currentJson = translations[getCurrentLanguage()];

export function getTranslation(label: TranslationKey): string {
  return currentJson[label] ?? zhJson[label];
}

export function substitute(input: string) {
  for (const key in currentJson) {
    input = input.replaceAll(`{${key}}`, currentJson[key as TranslationKey]);
  }
  return input;
}
