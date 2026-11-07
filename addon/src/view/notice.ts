const NOTICE_CONTAINER_ID = "ac-predictor-notices";

/**
 * 在榜单上方显示（或更新）一条提示；message 为 null 时移除该提示。
 * 同一 key 只显示一条，可在每次刷新数据时重复调用。
 */
export function setNotice(key: string, message: string | null, level: "warning" | "danger" | "info" = "warning", detail?: string) {
  const id = `ac-predictor-notice-${key}`;
  const existing = document.getElementById(id);
  if (message === null) {
    existing?.remove();
    return;
  }

  const container = getContainer();
  if (!container) {
    console.warn("[ac-predictor]", message, detail ?? "");
    return;
  }

  const elem = existing ?? document.createElement("div");
  elem.id = id;
  elem.className = `alert alert-${level}`;
  elem.style.marginBottom = "8px";
  elem.replaceChildren(message);
  if (detail) {
    const detailElem = document.createElement("div");
    detailElem.className = "small";
    detailElem.style.opacity = "0.75";
    detailElem.style.wordBreak = "break-all";
    detailElem.textContent = detail;
    elem.append(detailElem);
  }
  if (!existing) container.append(elem);
}

function getContainer(): HTMLElement | null {
  const existing = document.getElementById(NOTICE_CONTAINER_ID);
  if (existing) return existing;
  const anchor = document.querySelector(".table-responsive") ?? document.getElementById("vue-standings");
  if (!anchor?.parentElement) return null;
  const container = document.createElement("div");
  container.id = NOTICE_CONTAINER_ID;
  anchor.parentElement.insertBefore(container, anchor);
  return container;
}
