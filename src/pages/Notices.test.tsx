import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Notices from "./Notices";

describe("Notices", () => {
  it("sets the page title", () => {
    render(<Notices />);
    expect(document.title).toBe("Notices · CeyNex");
  });

  it("has one section per SRS notice", () => {
    render(<Notices />);
    for (const name of [
      "Not advice",
      "No warranty",
      "Data sources",
      "Usage limits",
      "Copyright",
      "Open-source software",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("credits every data source CeyNex cites, each with a link to its publisher", () => {
    render(<Notices />);
    for (const name of [
      "UN Comtrade",
      "FAOSTAT",
      "Commodity Price Data (the Pink Sheet)",
      "World Development Indicators",
      "Export statistics",
      "Apparel export data",
      "Tea export volumes",
      "Cinnamon export volumes",
      "News headlines",
      "Web results",
    ]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", expect.stringMatching(/^https:\/\//));
    }
  });

  it("does not present third-party data as CeyNex's own", () => {
    render(<Notices />);
    expect(screen.getByText(/Figures in answers come from the sources below, not from CeyNex itself/)).toBeInTheDocument();
  });

  it("links to the generated licence file for the bundled packages", () => {
    render(<Notices />);
    expect(screen.getByRole("link", { name: "third-party-licenses.txt" })).toHaveAttribute(
      "href",
      "/third-party-licenses.txt",
    );
  });
});
