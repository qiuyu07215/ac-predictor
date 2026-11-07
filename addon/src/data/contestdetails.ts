import { fetchAtCoderText, fetchDataJson } from "../util/request";
import Range from "../util/range";
import ContestDetails from "../domain/contestdetails";

export default async function getContestDetails(): Promise<ContestDetails[]> {
  const parsed = await fetchDataJson<any[]>(`contest-details.json`);

  const res: ContestDetails[] = [];
  for (const elem of parsed) {
    if (typeof elem !== "object") throw new Error("invalid object returned");
    if (typeof elem.contestName !== "string") throw new Error("invalid object returned");
    const contestName: string = elem.contestName;
    if (typeof elem.contestScreenName !== "string") throw new Error("invalid object returned");
    const contestScreenName: string = elem.contestScreenName;
    if (elem.contestType !== "algorithm" && elem.contestType !== "heuristic") throw new Error("invalid object returned");
    const contestType: "algorithm" | "heuristic" = elem.contestType;
    if (typeof elem.startTime !== "number") throw new Error("invalid object returned");
    const startTime: Date = new Date(elem.startTime * 1000);
    if (typeof elem.duration !== "number") throw new Error("invalid object returned");
    const duration: number = elem.duration;
    if (typeof elem.ratedrange !== "object" || typeof elem.ratedrange[0] !== "number" || typeof elem.ratedrange[1] !== "number") throw new Error("invalid object returned");
    const ratedRange: Range = new Range(elem.ratedrange[0], elem.ratedrange[1]);
    res.push(new ContestDetails(contestName, contestScreenName, contestType, startTime, duration, ratedRange));
  }
  return res;
}

/**
 * 从 AtCoder 比赛首页解析比赛信息。
 * 上游 contest-details.json 停止更新后，新比赛不在列表中，此时使用该函数作为后备。
 * 不带 ?lang= 参数请求，避免修改用户在 AtCoder 上的语言设置，因此同时兼容日文 / 英文页面。
 */
export function parseContestDetailsFromHTML(contestScreenName: string, html: string): ContestDetails {
  const startMatch = html.match(/var startTime = moment\("([^"]+)"\)/);
  const endMatch = html.match(/var endTime = moment\("([^"]+)"\)/);
  if (!startMatch || !endMatch) throw new Error("start / end time not found in contest page");
  const startTime = new Date(startMatch[1]);
  const endTime = new Date(endMatch[1]);
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) throw new Error("invalid start / end time in contest page");

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const contestName = (titleMatch?.[1] ?? contestScreenName).replace(/\s*-\s*AtCoder\s*$/, "").trim();

  const ratedMatch = html.match(/class="mr-2">Rated(?: Range|対象):([^\n]*)/);
  if (!ratedMatch) throw new Error("rated range not found in contest page");
  const ratedText = ratedMatch[1].replace(/<[^>]*>/g, "").trim();
  let ratedRange: Range;
  const rangeMatch = ratedText.match(/^(\d*)\s*[-~～]\s*(\d*)$/);
  if (/^(All|全員|全て)$/i.test(ratedText)) {
    ratedRange = new Range(-10000, 10000);
  }
  else if (rangeMatch && (rangeMatch[1] !== "" || rangeMatch[2] !== "")) {
    ratedRange = new Range(rangeMatch[1] === "" ? -10000 : Number(rangeMatch[1]), rangeMatch[2] === "" ? 10000 : Number(rangeMatch[2]));
  }
  else {
    ratedRange = new Range(0, -1); // unrated
  }

  const contestType = /^ahc\d/.test(contestScreenName) || /Heuristic/i.test(contestName) ? "heuristic" : "algorithm";
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  return new ContestDetails(contestName, contestScreenName, contestType, startTime, duration, ratedRange);
}

export async function getContestDetailsFromPage(contestScreenName: string): Promise<ContestDetails> {
  const html = await fetchAtCoderText(`/contests/${encodeURIComponent(contestScreenName)}`);
  return parseContestDetailsFromHTML(contestScreenName, html);
}

/**
 * 先在上游 contest-details.json 中查找比赛信息，找不到（或上游不可用）时改为解析 AtCoder 比赛首页。
 */
export async function resolveContestDetails(contestScreenName: string): Promise<{ contestDetails: ContestDetails, contestDetailsList: ContestDetails[], fromPage: boolean } | null> {
  let contestDetailsList: ContestDetails[] = [];
  try {
    contestDetailsList = await getContestDetails();
  }
  catch (e) {
    console.warn("[ac-predictor] failed to fetch contest-details.json, falling back to the contest page", e);
  }
  const found = contestDetailsList.find(details => details.contestScreenName == contestScreenName);
  if (found) return { contestDetails: found, contestDetailsList, fromPage: false };

  const contestDetails = await getContestDetailsFromPage(contestScreenName);
  // 上游列表本来就不收录 unrated 比赛，这种情况与原版一样不做预测
  if (!contestDetails.ratedrange.hasValue()) return null;
  console.warn(`[ac-predictor] ${contestScreenName} is not in contest-details.json; using details parsed from the contest page`, contestDetails);
  return { contestDetails, contestDetailsList: [...contestDetailsList, contestDetails], fromPage: true };
}
