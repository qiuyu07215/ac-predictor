import { estimateAPerf, estimateAPerfs } from "./estimateaperf";
import { calcAlgRatingFromHistory, positivizeRating } from "./rating";

describe("estimateAPerf", () => {
  test("first-time participants are left to the contest default", () => {
    expect(estimateAPerf("algorithm", 0, 0)).toBeNull();
    expect(estimateAPerf("heuristic", 1500, 0)).toBeNull();
  });

  test("algorithm: recovers a constant performance history (up to the soft-max offset)", () => {
    for (const n of [1, 3, 10, 40]) {
      const perf = 1600;
      const rating = positivizeRating(calcAlgRatingFromHistory(Array(n).fill(perf)));
      const estimated = estimateAPerf("algorithm", rating, n)!;
      expect(Math.abs(estimated - perf)).toBeLessThan(40);
    }
  });

  test("algorithm: works for low (positivized) ratings", () => {
    const perf = 200;
    const rating = positivizeRating(calcAlgRatingFromHistory(Array(5).fill(perf)));
    expect(Math.abs(estimateAPerf("algorithm", rating, 5)! - perf)).toBeLessThan(40);
  });

  test("heuristic: fewer contests mean a larger upward correction", () => {
    const few = estimateAPerf("heuristic", 1200, 2)! - 1200;
    const many = estimateAPerf("heuristic", 1200, 30)! - 1200;
    expect(few).toBeGreaterThan(many);
  });

  test("estimateAPerfs only returns users with rating info and past contests", () => {
    const infos = new Map([
      ["a", { rating: 1500, competitions: 20 }],
      ["b", { rating: 0, competitions: 0 }],
    ]);
    const res = estimateAPerfs("algorithm", infos, ["a", "b", "c"]);
    expect(Object.keys(res)).toEqual(["a"]);
  });
});
