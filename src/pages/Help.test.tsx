import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Help from "./Help";

describe("Help", () => {
  it("sets the page title", () => {
    render(<Help />);
    expect(document.title).toBe("Help & FAQ · CeyNex");
  });

  it("renders the FAQ as a real definition list, not styled divs", () => {
    const { container } = render(<Help />);
    expect(container.querySelector("dl")).toBeInTheDocument();
  });

  it("renders a representative question and its answer", () => {
    render(<Help />);
    expect(screen.getByText("What are API keys for?")).toBeInTheDocument();
    expect(screen.getByText(/only its prefix is shown afterward/)).toBeInTheDocument();
  });
});
