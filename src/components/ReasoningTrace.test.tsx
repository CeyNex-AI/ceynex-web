import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ReasoningTrace from "./ReasoningTrace";
import type { TraceEvent } from "../types/chat";

describe("ReasoningTrace", () => {
  it("never renders a blank step label, even when the backend sends an empty one", async () => {
    // Regression, found live 2026-09-16 (NVDA pass, ceynex-web#28): a `thought`
    // event with an empty `step` rendered as a bare checkmark with no text —
    // NVDA read four of these in a row as just "done:", and a screenshot
    // confirmed sighted users saw the same blank rows.
    const user = userEvent.setup();
    const events: TraceEvent[] = [
      { kind: "thought", seq: 1, step: "" },
      { kind: "thought", seq: 2, step: "Real step" },
    ];
    // running=false, so the "collapse once the turn finishes" effect closes
    // the panel on mount regardless of defaultOpen — open it for real, the
    // way a reader would.
    render(<ReasoningTrace events={events} running={false} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Planning step")).toBeInTheDocument();
    expect(screen.getByText("Real step")).toBeInTheDocument();
  });

  it("shows a readable fallback instead of a bare '(?)' when the model role is missing", async () => {
    const user = userEvent.setup();
    const events: TraceEvent[] = [
      { kind: "llm_call", seq: 1, role: undefined, tokens_in: 0, tokens_out: 0 },
    ];
    render(<ReasoningTrace events={events} running={false} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Language model (role not reported)")).toBeInTheDocument();
    expect(screen.queryByText("Language model (?)")).not.toBeInTheDocument();
  });

  it("separates the toggle button's status and action text for a screen reader", () => {
    // Regression, found live 2026-09-16: the flex `gap` between these two
    // spans is visual only, so a screen reader flattening the button's text
    // read "Thought for 7.3sShow steps" with nothing between them. The fix
    // adds an sr-only separator; this asserts the flattened text has a real
    // boundary between the summary and "Show steps", not a run-on word.
    const events: TraceEvent[] = [{ kind: "route", seq: 1, route: ["export_analytics"] }];
    render(<ReasoningTrace events={events} running={false} elapsedMs={7300} />);
    const toggle = screen.getByRole("button", { name: /Show steps/ });
    expect(toggle.textContent).not.toContain("7.3sShow steps");
    expect(toggle.textContent).toMatch(/,\s*Show steps$/);
  });

  it("still separates status and action text while steps are loading", async () => {
    const user = userEvent.setup();
    render(<ReasoningTrace events={[]} running={false} onOpen={() => {}} loading />);
    const toggle = screen.getByRole("button");
    await user.click(toggle);
    expect(toggle.textContent).not.toContain("steps…Hide");
    expect(toggle.textContent).toMatch(/,\s*Hide steps$/);
  });
});
