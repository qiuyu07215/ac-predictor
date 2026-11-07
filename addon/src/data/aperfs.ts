import ContestDetails from "../domain/contestdetails";
import { estimateAPerfs } from "../domain/estimateaperf";
import { fetchDataJson, NotFoundError } from "../util/request";

type APerfs = { [userScreenName: string]: number };

export default async function getAPerfs(contestScreenName: string): Promise<APerfs> {
  return await fetchDataJson<APerfs>(`aperfs/${encodeURIComponent(contestScreenName)}.json`);
}

export type APerfsResult = {
  aperfs: APerfs,
  /** true のとき aperfs は上游データではなく Rating からの推定値 */
  estimated: boolean,
  /** 推定に切り替えた理由（上游データ取得時のエラー） */
  reason?: string,
};

type StandingsLike = {
  toRatedUsers(contestType: "algorithm" | "heuristic"): string[],
  toRatingInfos(): Map<string, { rating: number, competitions: number }>,
};

// 上游データの取得結果を覚えておき、順位表の更新のたびに全データソースへ問い合わせ直さないようにする
const SUCCESS_TTL = 10 * 60 * 1000;
const NOT_FOUND_TTL = 5 * 60 * 1000;
const FAILURE_TTL = 60 * 1000;
const memo = new Map<string, { expires: number, aperfs?: APerfs, error?: string }>();

async function getAPerfsMemoized(contestScreenName: string): Promise<{ aperfs?: APerfs, error?: string }> {
  const cached = memo.get(contestScreenName);
  if (cached && Date.now() < cached.expires) return cached;
  try {
    const aperfs = await getAPerfs(contestScreenName);
    const entry = { expires: Date.now() + SUCCESS_TTL, aperfs };
    memo.set(contestScreenName, entry);
    return entry;
  }
  catch (e) {
    const notFound = e instanceof NotFoundError;
    const entry = { expires: Date.now() + (notFound ? NOT_FOUND_TTL : FAILURE_TTL), error: notFound ? `not found: ${(e as Error).message}` : String((e as Error)?.message ?? e) };
    memo.set(contestScreenName, entry);
    return entry;
  }
}

/**
 * 上游の aperf データを取得し、取得できない場合（未生成・上游停止・ネットワーク障害）は
 * 順位表の Rating と参加回数から推定する。
 */
export async function getAPerfsOrEstimate(contestDetails: ContestDetails, standings: StandingsLike): Promise<APerfsResult> {
  const result = await getAPerfsMemoized(contestDetails.contestScreenName);
  if (result.aperfs) return { aperfs: result.aperfs, estimated: false };
  console.warn(`[ac-predictor] aperfs unavailable for ${contestDetails.contestScreenName}, falling back to estimation:`, result.error);
  const users = standings.toRatedUsers(contestDetails.contestType);
  return {
    aperfs: estimateAPerfs(contestDetails.contestType, standings.toRatingInfos(), users),
    estimated: true,
    reason: result.error,
  };
}
