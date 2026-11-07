import { algRatingCorrection, unpositivizeRating } from "./rating";

/**
 * 在上游 aperf 数据缺失时，根据选手赛前的 Rating 与参赛次数近似估算 aperf。
 *
 * - 算法赛：Rating = 800·log2(Σ2^(perf/800)·0.9^i / Σ0.9^i) − f(n)，
 *   去掉参赛次数修正 f(n) 后是加权表现分的“软最大值”，略高于 aperf（加权平均），
 *   因此再减去一个经验常数。用 abc480 / abc481 / arc211 校准：参赛 ≥ 6 次的选手 aperf 平均误差约 20～50，
 *   最终算出的表现分与使用真实 aperf 时平均相差 7～14。
 * - 启发式赛：Rating 公式不同，按“所有表现分相同”时 Rating 与表现分之差估算，
 *   用 ahc056～ahc058 校准，aperf 误差约 ±150～200，最终表现分平均相差约 55。
 *
 * 首次参赛（competitions = 0）返回 null，由调用方使用比赛的默认 aperf。
 */
export function estimateAPerf(contestType: "algorithm" | "heuristic", positivizedRating: number, competitions: number): number | null {
  if (!(competitions > 0) || !(positivizedRating > 0)) return null;
  const rating = unpositivizeRating(positivizedRating);
  if (contestType === "algorithm") {
    return rating + algRatingCorrection(competitions) + ALG_OFFSET;
  }
  const blend = Math.min(Math.max((competitions - 6) / 9, 0), 1);
  return rating - heuristicRatingOffset(competitions) + HEURISTIC_OFFSET_FEW + (HEURISTIC_OFFSET_MANY - HEURISTIC_OFFSET_FEW) * blend;
}

const ALG_OFFSET = -28;
const HEURISTIC_OFFSET_FEW = -20;
const HEURISTIC_OFFSET_MANY = -180;

const heuristicOffsetMemo = new Map<number, number>();
/** 参加 n 回・すべて同じパフォーマンス (重み 0.5) のときの「レーティング − パフォーマンス」 */
function heuristicRatingOffset(n: number): number {
  n = Math.min(n, 60); // 60 回以上はほぼ変化しない
  const memo = heuristicOffsetMemo.get(n);
  if (memo !== undefined) return memo;
  const S = 724.4744301;
  const R = 0.8271973364;
  const WEIGHT = 0.5;
  const qs: number[] = [];
  for (let k = 0; k < n; k++) {
    for (let i = 1; i <= 100; i++) qs.push(150 - S * Math.log(i));
  }
  qs.sort((a, b) => b - a);
  let r = 0;
  let s = 0;
  for (const q of qs) {
    s += WEIGHT;
    r += q * (R ** (s - WEIGHT) - R ** s);
  }
  heuristicOffsetMemo.set(n, r);
  return r;
}

type RatingInfos = Map<string, { rating: number, competitions: number }>;

export function estimateAPerfs(contestType: "algorithm" | "heuristic", ratingInfos: RatingInfos, users: string[]): { [userScreenName: string]: number } {
  const res: { [userScreenName: string]: number } = {};
  for (const user of users) {
    const info = ratingInfos.get(user);
    if (!info) continue;
    const estimated = estimateAPerf(contestType, info.rating, info.competitions);
    if (estimated !== null) res[user] = estimated;
  }
  return res;
}
