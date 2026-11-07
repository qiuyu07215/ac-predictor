import { getAPerfsOrEstimate } from "../data/aperfs";
import { resolveContestDetails } from "../data/contestdetails";
import getExtendedStandings from "../data/extendedstandings";
import ContestDetails from "../domain/contestdetails";
import EloPerformanceProvider from "../domain/performanceprovider/elo";
import InterpolatePerformanceProvider from "../domain/performanceprovider/interpolate";
import PerformanceProvider from "../domain/performanceprovider/performanceprovider";
import { normalizeRank } from "../domain/ranks";
import { positivizeRating } from "../domain/rating";
import getContestScreenName from "../parse/contestScreenName";
import hasOwnProperty from "../util/hasOwnProperty";
import StandingsLoadingView from "../view/standingsloading";
import StandingsTableView from "../view/standingstable";
import { getTranslation } from "../i18n/i18n";
import { clearLoadError, errorToString, showAPerfNotice, showLoadError } from "./notices";

export default class ExtendedStandingsPageController {
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

    const extendedStandings = await getExtendedStandings(this.contestDetails.contestScreenName);
    const aperfsResult = await getAPerfsOrEstimate(this.contestDetails, extendedStandings);
    showAPerfNotice(this.contestDetails, aperfsResult);
    const aperfsObj = aperfsResult.aperfs;
    const defaultAPerf = this.contestDetails.defaultAPerf;

    const normalizedRanks = normalizeRank(extendedStandings.toRanks(true, this.contestDetails.contestType));
    const aperfsList = extendedStandings.toRatedUsers(this.contestDetails.contestType).map(userScreenName => hasOwnProperty(aperfsObj, userScreenName) ? aperfsObj[userScreenName] : defaultAPerf);
    
    const basePerformanceProvider = new EloPerformanceProvider(normalizedRanks, aperfsList, this.contestDetails.performanceCap);
    const ranks = extendedStandings.toRanks();
    this.performanceProvider = new InterpolatePerformanceProvider(ranks, basePerformanceProvider);
  }
}
