import { parseContestDetailsFromHTML } from "./contestdetails";

function page(title: string, rated: string, start: string, end: string) {
  return `<html><head><title>${title} - AtCoder</title></head><body>
<script>
var startTime = moment("${start}");
var endTime = moment("${end}");
</script>
			<span class="mr-2">Rated${rated}</span>
</body></html>`;
}

describe("parseContestDetailsFromHTML", () => {
  test("ABC (English)", () => {
    const d = parseContestDetailsFromHTML("abc483", page("AtCoder Beginner Contest 483", " Range:  - 1999", "2026-11-07T21:00:00+09:00", "2026-11-07T22:40:00+09:00"));
    expect(d.contestName).toBe("AtCoder Beginner Contest 483");
    expect(d.contestType).toBe("algorithm");
    expect(d.duration).toBe(100 * 60);
    expect(d.ratedrange.start).toBe(-10000);
    expect(d.ratedrange.end).toBe(1999);
    expect(d.defaultAPerf).toBe(1200);
    expect(d.performanceCap).toBe(2400);
  });

  test("ABC (Japanese)", () => {
    const d = parseContestDetailsFromHTML("abc400", page("AtCoder Beginner Contest 400", "対象:  ~ 1999", "2025-04-05T21:00:00+09:00", "2025-04-05T22:40:00+09:00"));
    expect(d.ratedrange.end).toBe(1999);
    expect(d.ratedrange.contains(0)).toBe(true);
  });

  test("ARC with both bounds and AGC with lower bound only", () => {
    const arc = parseContestDetailsFromHTML("arc200", page("AtCoder Regular Contest 200 (Div. 2)", " Range: 1200 - 2399", "2025-06-15T21:00:00+09:00", "2025-06-15T23:00:00+09:00"));
    expect([arc.ratedrange.start, arc.ratedrange.end]).toEqual([1200, 2399]);
    const agc = parseContestDetailsFromHTML("agc072", page("AtCoder Grand Contest 072", " Range: 2000 - ", "2025-04-20T21:00:00+09:00", "2025-04-21T00:00:00+09:00"));
    expect([agc.ratedrange.start, agc.ratedrange.end]).toEqual([2000, 10000]);
    expect(agc.performanceCap).toBe(Infinity);
  });

  test("AHC is heuristic and rated for all", () => {
    const d = parseContestDetailsFromHTML("ahc050", page("AtCoder Heuristic Contest 050", " Range: All", "2025-07-06T19:00:00+09:00", "2025-07-06T23:00:00+09:00"));
    expect(d.contestType).toBe("heuristic");
    expect(d.ratedrange.contains(3000)).toBe(true);
  });

  test("unrated contests have an empty range", () => {
    const d = parseContestDetailsFromHTML("practice", page("Practice", " Range: -", "2025-01-01T00:00:00+09:00", "2025-01-02T00:00:00+09:00"));
    expect(d.ratedrange.hasValue()).toBe(false);
  });

  test("throws when the page lacks the needed information", () => {
    expect(() => parseContestDetailsFromHTML("x", "<html></html>")).toThrow();
  });
});
