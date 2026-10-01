import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SiteFooter from "./SiteFooter";

function renderFooter() {
  return render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>,
  );
}

describe("SiteFooter", () => {
  it("is the page's contentinfo landmark", () => {
    renderFooter();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("states that answers are not advice and come without warranty (LG-01)", () => {
    renderFooter();
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(/not financial, legal, investment or official policy advice/);
    expect(footer).toHaveTextContent(/as is, without warranty/);
  });

  it("carries the copyright notice (LG-07)", () => {
    renderFooter();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026 CeyNex");
  });

  it("links to the notices page", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Notices and data sources" })).toHaveAttribute(
      "href",
      "/notices",
    );
  });

  it("names no link Account, Menu or Close, which e2e login() matches by substring", () => {
    renderFooter();
    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/account|menu|close/i);
    }
  });
});
