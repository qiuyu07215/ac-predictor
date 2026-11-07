import { getTranslation } from "../i18n/i18n";
import { getConfig, Language, setConfig } from "../util/config";
import isDebugMode from "../util/isdebugmode";
import { isValidDataSourceUrl } from "../util/request";
import ConfigView from "../view/config/config";

export default class ConfigController {
  public register() {
    const configView = ConfigView.Create();
    
    // TODO: 流石に処理をまとめたい
    configView.addCheckbox(getTranslation("config_useFinalResultOnVirtual_label"), getConfig("useFinalResultOnVirtual"), getTranslation("config_useFinalResultOnVirtual_description"), val => setConfig("useFinalResultOnVirtual", val));
    configView.addCheckbox(getTranslation("config_hideDuringContest_label"), getConfig("hideDuringContest"), null, val => setConfig("hideDuringContest", val));
    configView.addCheckbox(getTranslation("config_hideUntilFixed_label"), getConfig("hideUntilFixed"), null, val => setConfig("hideUntilFixed", val));

    configView.addSelect<Language>(
      getTranslation("config_language_label"),
      getConfig("language"),
      [
        { value: "zh", label: "简体中文" },
        { value: "ja", label: "日本語" },
        { value: "en", label: "English" },
        { value: "auto", label: getTranslation("config_language_auto") },
      ],
      getTranslation("config_language_reload_hint"),
      val => setConfig("language", val)
    );

    configView.addHeader(4, getTranslation("config_network_header"));
    configView.addTextInput(
      getTranslation("config_dataSource_label"),
      getConfig("dataSourceUrl"),
      "url",
      getTranslation("config_dataSource_placeholder"),
      getTranslation("config_dataSource_description"),
      val => {
        if (!isValidDataSourceUrl(val)) return false;
        setConfig("dataSourceUrl", val.trim());
        return true;
      }
    );
    configView.addTextInput(
      getTranslation("config_requestTimeout_label"),
      String(getConfig("requestTimeout")),
      "number",
      null,
      getTranslation("config_requestTimeout_description"),
      val => {
        const num = Number(val);
        if (!isFinite(num) || num <= 0 || num > 120) return false;
        setConfig("requestTimeout", num);
        return true;
      }
    );

    if (isDebugMode()) {
      configView.addCheckbox("[DEBUG] enable debug mode", getConfig("isDebug"), null, val => setConfig("isDebug", val));
      configView.addCheckbox("[DEBUG] use results", getConfig("useResults"), null, val => setConfig("useResults", val));
      configView.addCheckbox("[DEBUG] compare", getConfig("compareComputations"), null, val => setConfig("compareComputations", val));
    }
  }
}
