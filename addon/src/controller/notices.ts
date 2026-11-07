import { APerfsResult } from "../data/aperfs";
import ContestDetails from "../domain/contestdetails";
import { getTranslation } from "../i18n/i18n";
import { setNotice } from "../view/notice";

export function showAPerfNotice(contestDetails: ContestDetails, result: APerfsResult) {
  if (!result.estimated) {
    setNotice("aperf", null);
    return;
  }
  const message = contestDetails.contestType === "heuristic" ? getTranslation("notice_aperf_estimated_heuristic") : getTranslation("notice_aperf_estimated");
  setNotice("aperf", message, "warning", result.reason);
}

export function showLoadError(e: unknown) {
  console.error("[ac-predictor]", e);
  setNotice("load-error", getTranslation("notice_load_failed"), "danger", errorToString(e));
}

export function clearLoadError() {
  setNotice("load-error", null);
}

export function errorToString(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
