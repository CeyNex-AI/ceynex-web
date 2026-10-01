import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AnswerDisclaimer from "./AnswerDisclaimer";

describe("AnswerDisclaimer", () => {
  it("says an answer is an estimate, not advice", () => {
    render(<AnswerDisclaimer />);
    expect(screen.getByText(/An estimate from the cited data and models/)).toBeInTheDocument();
    expect(screen.getByText(/Not financial, legal, investment or policy advice/)).toBeInTheDocument();
  });

  it("says a scenario result is a what-if, not a forecast", () => {
    render(<AnswerDisclaimer kind="scenario" />);
    expect(screen.getByText(/A what-if estimate from the stated assumptions, not a forecast/)).toBeInTheDocument();
  });

  it("is not a status region, which the scenario e2e looks up with a strict getByRole", () => {
    const { container } = render(<AnswerDisclaimer kind="scenario" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
});
