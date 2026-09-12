import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  formatPct,
  formatUsd,
  parametersFor,
  parseWorkbenchParams,
  toSearchParams,
  withSector,
  withShock,
  workbenchHrefFor,
} from "./scenario";

describe("parseWorkbenchParams", () => {
  it("returns the defaults for an empty query string", () => {
    expect(parseWorkbenchParams("")).toEqual(DEFAULT_STATE);
  });

  it("round-trips through toSearchParams", () => {
    const state = {
      shock: "tariff" as const,
      sector: "apparel" as const,
      item: "apparel_woven",
      magnitude: 0.1,
      overrides: { export_demand_elasticity: -2, tariff_incidence: 0.7 },
    };
    expect(parseWorkbenchParams("?" + toSearchParams(state))).toEqual(state);
  });

  it("ignores values the API would reject rather than sending them", () => {
    const state = parseWorkbenchParams(
      "?shock=devaluation&sector=fisheries&magnitude=7&fx_pass_through=3&export_demand_elasticity=-1.5",
    );
    expect(state.shock).toBe("fx");
    expect(state.sector).toBe("agriculture");
    expect(state.magnitude).toBe(DEFAULT_STATE.magnitude);
    expect(state.overrides).toEqual({ export_demand_elasticity: -1.5 });
  });

  it("falls back to the sector's first item when the item belongs elsewhere", () => {
    expect(parseWorkbenchParams("?sector=apparel&item=tea").item).toBe("apparel_knit");
  });

  it("drops the magnitude from an agreement URL, whose rate is a parameter", () => {
    expect(toSearchParams({ ...DEFAULT_STATE, shock: "agreement" })).not.toContain("magnitude");
  });
});

describe("state transitions", () => {
  it("changing sector picks that sector's first item", () => {
    expect(withSector(DEFAULT_STATE, "apparel").item).toBe("apparel_knit");
    expect(withSector(DEFAULT_STATE, "agriculture")).toBe(DEFAULT_STATE);
  });

  it("changing shock keeps only the overrides the new shock uses", () => {
    const moved = withShock(
      { ...DEFAULT_STATE, overrides: { fx_pass_through: 0.9, export_demand_elasticity: -2 } },
      "tariff",
    );
    expect(moved.overrides).toEqual({ export_demand_elasticity: -2 });
    expect(parametersFor("tariff").map((p) => p.name)).toEqual([
      "export_demand_elasticity",
      "tariff_incidence",
    ]);
  });
});

describe("formatting", () => {
  it("shows a sign and no decimals on dollars", () => {
    expect(formatUsd(-5999.99)).toBe("−USD 6,000");
    expect(formatUsd(4000)).toBe("+USD 4,000");
    expect(formatUsd(0)).toBe("USD 0");
  });

  it("shows a signed percentage from a fraction", () => {
    expect(formatPct(-0.006)).toBe("−0.6%");
    expect(formatPct(0.048)).toBe("+4.8%");
  });
});

describe("workbenchHrefFor", () => {
  it("offers nothing for an answer that did not simulate", () => {
    expect(workbenchHrefFor("tea price trend", { route: ["export_analytics"], sectors: ["agriculture"] })).toBeNull();
  });

  it("reads the shock, sector, item and magnitude from the question", () => {
    const href = workbenchHrefFor("What if the EU raised tariffs on Sri Lankan tea by 10%?", {
      route: ["trade_economics"],
      sectors: ["agriculture"],
    });
    expect(href).toBe("/scenario?shock=tariff&sector=agriculture&item=tea&magnitude=0.1");
  });

  it("treats a preference question as an agreement shock on the apparel side", () => {
    const href = workbenchHrefFor("How would losing GSP+ affect apparel export revenue?", {
      route: ["trade_economics", "apparel_manufacturing"],
      sectors: ["apparel"],
    });
    expect(href).toBe("/scenario?shock=agreement&sector=apparel&item=apparel_knit");
  });
});
