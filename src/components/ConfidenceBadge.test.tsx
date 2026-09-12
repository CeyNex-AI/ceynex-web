import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfidenceBadge from "./ConfidenceBadge";
import { ThemeContext } from "../lib/themeContext";
import type { Theme } from "../lib/siteApi";

function renderWithTheme(score: number, theme: Theme) {
  return render(
    <ThemeContext.Provider value={{ theme, setTheme: vi.fn() }}>
      <ConfidenceBadge score={score} />
    </ThemeContext.Provider>,
  );
}

describe("ConfidenceBadge", () => {
  it("labels a high score as High confidence in the classic theme", () => {
    renderWithTheme(0.9, "classic");
    expect(screen.getByText(/High confidence/)).toBeInTheDocument();
    expect(screen.getByText("· 90%")).toBeInTheDocument();
  });

  it("labels a low score as Low, not Very low, right at the 0.3 boundary", () => {
    renderWithTheme(0.3, "classic");
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument();
  });

  it("renders the same band and percentage as an accessible SVG in the signal-deck theme", () => {
    renderWithTheme(0.6, "signal-deck");
    expect(screen.getByRole("img", { name: "Confidence 60 percent, Moderate" })).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });
});
