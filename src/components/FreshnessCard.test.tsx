import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as adminApi from "../lib/adminApi";
import FreshnessCard from "./FreshnessCard";

const source = (overrides: Partial<adminApi.SourceFreshnessItem>): adminApi.SourceFreshnessItem => ({
  source_id: "UN_COMTRADE",
  cadence_days: 35,
  refresh: true,
  last_success_at: "2026-08-26T08:25:53+00:00",
  last_success_rows: 6712,
  last_failure_at: null,
  last_error: null,
  age_days: 36.2,
  stale: true,
  ...overrides,
});

describe("FreshnessCard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("marks a source past its cadence stale, a fresh one current and a hand-refreshed one manual", async () => {
    vi.spyOn(adminApi, "fetchPipelineFreshness").mockResolvedValue({
      stale: 1,
      sources: [
        source({}),
        source({ source_id: "PINK_SHEET", stale: false, age_days: 7 }),
        source({ source_id: "EDB", cadence_days: null, refresh: false, stale: false }),
      ],
    });
    render(<FreshnessCard />);

    const table = await screen.findByRole("table", { name: "Data freshness by source" });
    const row = (name: string) =>
      within(table).getAllByRole("row").find((r) => r.textContent?.startsWith(name)) as HTMLElement;
    expect(within(row("UN_COMTRADE")).getByText("stale")).toBeInTheDocument();
    expect(within(row("PINK_SHEET")).getByText("current")).toBeInTheDocument();
    expect(within(row("EDB")).getByText("manual")).toBeInTheDocument();
    expect(screen.getByText("1 source is past its refresh cadence.")).toBeInTheDocument();
  });

  it("shows a failure newer than the last success, with its error", async () => {
    vi.spyOn(adminApi, "fetchPipelineFreshness").mockResolvedValue({
      stale: 1,
      sources: [source({ last_failure_at: "2026-10-02T04:30:00+00:00", last_error: "comtrade unreachable" })],
    });
    render(<FreshnessCard />);
    expect(await screen.findByText(/comtrade unreachable/)).toBeInTheDocument();
  });

  it("says when every scheduled source is current", async () => {
    vi.spyOn(adminApi, "fetchPipelineFreshness").mockResolvedValue({ stale: 0, sources: [] });
    render(<FreshnessCard />);
    expect(await screen.findByText("Every scheduled source is within its refresh cadence.")).toBeInTheDocument();
  });

  it("reports a failed load as an alert", async () => {
    vi.spyOn(adminApi, "fetchPipelineFreshness").mockRejectedValue(new Error("Loading data freshness failed (503)."));
    render(<FreshnessCard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("503");
  });
});
