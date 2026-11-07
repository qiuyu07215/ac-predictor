import modalHTML from "./modal.html";
import newDropdownElem from "./newDropdownElem.html";
import legacyDropdownElem from "./legacyDropdownElem.html";
import { substitute } from "../../i18n/i18n";

export default class ConfigView {
  modalElement: HTMLElement;
  constructor(modalElement: HTMLElement) {
    this.modalElement = modalElement;
  }

  public addCheckbox(label: string, val: boolean, description: string | null, handler: (val: boolean) => void) {
    const settingsRow = this.getSettingsRow();
    
    const div = document.createElement("div");
    div.classList.add("checkbox");
    const labelElem = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = val;
    labelElem.append(input);
    labelElem.append(label);
    if (description) {
      const descriptionDiv = document.createElement("div");
      descriptionDiv.append(description);
      descriptionDiv.classList.add("small");
      descriptionDiv.classList.add("gray");
      labelElem.append(descriptionDiv);
    }
    div.append(labelElem);
    settingsRow.append(div);

    input.addEventListener("change", () => {
      handler(input.checked);
    });
  }

  public addSelect<T extends string>(label: string, val: T, options: { value: T, label: string }[], description: string | null, handler: (val: T) => void) {
    const settingsRow = this.getSettingsRow();

    const div = document.createElement("div");
    div.classList.add("form-group");
    const labelElem = document.createElement("label");
    labelElem.append(label);
    const select = document.createElement("select");
    select.classList.add("form-control");
    for (const option of options) {
      const optionElem = document.createElement("option");
      optionElem.value = option.value;
      optionElem.textContent = option.label;
      optionElem.selected = option.value === val;
      select.append(optionElem);
    }
    div.append(labelElem, select);
    this.appendDescription(div, description);
    settingsRow.append(div);

    select.addEventListener("change", () => {
      handler(select.value as T);
    });
  }

  /** handler が false を返した場合は入力欄をエラー表示にする */
  public addTextInput(label: string, val: string, type: "text" | "number" | "url", placeholder: string | null, description: string | null, handler: (val: string) => boolean) {
    const settingsRow = this.getSettingsRow();

    const div = document.createElement("div");
    div.classList.add("form-group");
    const labelElem = document.createElement("label");
    labelElem.append(label);
    const input = document.createElement("input");
    input.type = type;
    input.classList.add("form-control");
    input.value = val;
    if (placeholder) input.placeholder = placeholder;
    div.append(labelElem, input);
    this.appendDescription(div, description);
    settingsRow.append(div);

    input.addEventListener("change", () => {
      const ok = handler(input.value);
      div.classList.toggle("has-error", !ok);
    });
  }

  private appendDescription(parent: HTMLElement, description: string | null) {
    if (!description) return;
    const descriptionDiv = document.createElement("div");
    descriptionDiv.append(description);
    descriptionDiv.classList.add("small");
    descriptionDiv.classList.add("gray");
    parent.append(descriptionDiv);
  }

  public addHeader(level: 1 | 2 | 3 | 4 | 5 | 6, content: string) {
    const settingsRow = this.getSettingsRow();

    const div = document.createElement(`h${level}`);
    div.textContent = content;
    settingsRow.append(div);
  }

  private getSettingsRow() {
    return this.modalElement.querySelector(".settings-row")!;
  }

  static Create() {
    document.querySelector("body")?.insertAdjacentHTML("afterbegin", substitute(modalHTML));
    document.querySelector(".header-mypage_list li:nth-last-child(1)")?.insertAdjacentHTML("beforebegin", substitute(newDropdownElem));
    document.querySelector(".navbar-right .dropdown-menu .divider:nth-last-child(2)")?.insertAdjacentHTML("beforebegin", substitute(legacyDropdownElem));

    const element = document.querySelector<HTMLElement>("#modal-ac-predictor-settings");
    if (element === null) {
      throw new Error("settings modal not found");
    }
    return new ConfigView(element);
  }
}
