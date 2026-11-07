import { getAPerfsOrEstimate } from "../data/aperfs";
import { resolveContestDetails } from "../data/contestdetails";
import getResults from "../data/results";
import getStandings from "../data/standings";
import getVirtualStandings from "../data/virtualstandings";
import ContestDetails from "../domain/contestdetails";
import EloPerformanceProvider from "../domain/performanceprovider/elo";
import FixedPerformanceProvider from "../domain/performanceprovider/fixed";
import InterpolatePerformanceProvider from "../domain/performanceprovider/interpolate";
import PerformanceProvider from "../domain/performanceprovider/performanceprovider";
import { normalizeRank } from "../domain/ranks";
import { positivizeRating } from "../domain/rating";
import getContestScreenName from "../parse/contestScreenName";
import duringVirtualParticipation from "../parse/duringVirtualParticipation";
import { getConfig } from "../util/config";
import hasOwnProperty from "../util/hasOwnProperty";
import StandingsLoadingView from "../view/standingsloading";
import StandingsTableView from "../view/standingstable";
import { getTranslation } from "../i18n/i18n";
import { clearLoadError, errorToString, showAPerfNotice, showLoadError } from "./notices";

type Scores = Map<string, { score: number, penalty: number }>;

function forgeCombinedRanks(a: Scores, b: Scores): Map<string, number> {
  const res = new Map<string, number>();

  const merged = [...a.entries(), ...b.entries()].sort((a, b) => a[1].score !== b[1].score ? b[1].score - a[1].score : a[1].penalty - b[1].penalty);

  let rank = 0;
  let prevScore = NaN;
  let prevPenalty = NaN;
  for (const [userScreenName, { score, penalty }] of merged) {
    if (score !== prevScore || penalty !== prevPenalty) {
      rank++;
      prevScore = score;
      prevPenalty = penalty;
    }
    res.set(userScreenName, rank);
  }

  return res;
}

function remapKey<KeyT, ValT, NewKeyT>(map: Map<KeyT, ValT>, mappingFunction: (key: KeyT) => NewKeyT): Map<NewKeyT, ValT> {
  const newMap = new Map<NewKeyT, ValT>();
  for (const [key, val] of map) {
    newMap.set(mappingFunction(key), val);
  }
  return newMap;
}

export default class VirtualStandingsPageController {
  contestDetails?: ContestDetails;

  performanceProvider?: PerformanceProvider;
  standingsTableView?: StandingsTableView;
  loadError?: string;

  public async register() {
    const loading = StandingsLoadingView.Get();
    loading.onLoad(() => this.initialize());
  }

  private async initialize() {
    try {
      await this.initializeInner();
    }
    catch (e) {
      showLoadError(e);
    }
  }

  private async initializeInner() {
    const contestScreenName = getContestScreenName();

    const resolved = await resolveContestDetails(contestScreenName);
    if (resolved === null) return;
    this.contestDetails = resolved.contestDetails;

    this.standingsTableView = StandingsTableView.Get(async userScreenName => {
      if (!this.performanceProvider) {
        return { "type": "error", "message": this.loadError ? `${getTranslation("standings_load_failed_label")}: ${this.loadError}` : getTranslation("standings_not_ready_label") };
      }
      if (!this.performanceProvider.availableFor(userScreenName)) return { "type": "error", "message": `performance not available for ${userScreenName}` };

      const originalPerformance = this.performanceProvider.getPerformance(userScreenName);
      const positivizedPerformance = Math.round(positivizeRating(originalPerformance));
      return { type: "perfonly", performance: positivizedPerformance };
    });
    this.standingsTableView.onRefreshed(() => this.refresh());
    await this.refresh();
  }

  private async refresh() {
    try {
      await this.updateData();
      this.loadError = undefined;
      clearLoadError();
    }
    catch (e) {
      this.loadError = errorToString(e);
      showLoadError(e);
    }
    this.standingsTableView!.update();
  }

  private async updateData() {
    if (!this.contestDetails) throw new Error("contestDetails missing");

    const virtualStandings = await getVirtualStandings(this.contestDetails.contestScreenName, true);
    const results = await getResults(this.contestDetails.contestScreenName);
    
    let ranks: Map<string, number>;
    let basePerformanceProvider: PerformanceProvider;
    if ((!duringVirtualParticipation() || getConfig("useFinalResultOnVirtual")) && getConfig("useResults")) {
      const standings = await getStandings(this.contestDetails.contestScreenName);
      const referencePerformanceMap = remapKey(results.toPerformanceMaps(), userScreenName => `reference:${userScreenName}`);
      basePerformanceProvider = new FixedPerformanceProvider(referencePerformanceMap);

      ranks = forgeCombinedRanks(remapKey(standings.toScores(), userScreenName => `reference:${userScreenName}`), virtualStandings.toScores());
    }
    else {
      const aperfsResult = await getAPerfsOrEstimate(this.contestDetails, virtualStandings);
      showAPerfNotice(this.contestDetails, aperfsResult);
      const aperfsObj = aperfsResult.aperfs;
      const defaultAPerf = this.contestDetails.defaultAPerf;
      const normalizedRanks = normalizeRank(virtualStandings.toRanks(true, this.contestDetails.contestType));
      const aperfsList = virtualStandings.toRatedUsers(this.contestDetails.contestType).map(userScreenName => hasOwnProperty(aperfsObj, userScreenName) ? aperfsObj[userScreenName] : defaultAPerf);
      
      basePerformanceProvider = new EloPerformanceProvider(normalizedRanks, aperfsList, this.contestDetails.performanceCap);

      ranks = virtualStandings.toRanks();
    }
    
    this.performanceProvider = new InterpolatePerformanceProvider(ranks, basePerformanceProvider);
  }
}
