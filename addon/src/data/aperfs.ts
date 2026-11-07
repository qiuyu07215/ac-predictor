import { fetchDataJson } from "../util/request";

export default async function getAPerfs(contestScreenName: string): Promise<{ [userScreenName: string]: number }> {
  return await fetchDataJson<{ [userScreenName: string]: number }>(`aperfs/${encodeURIComponent(contestScreenName)}.json`);
}
