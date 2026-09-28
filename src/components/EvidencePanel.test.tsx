import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EvidencePanel from "./EvidencePanel";
import type { Evidence } from "../types/contracts";

// A general web result (backend D14) is text somebody published, which nobody
// here has verified. Once TAVILY_API_KEY is set it reaches this panel on every
// recency-worded question, so these pin the three things that keep it inert and
// honest: it renders as text, it is marked as unverified, and it offers no
// "query" to re-run because there is none.
const HOSTILE_CLAIM = `Tea prices <img src=x onerror="window.__pwned=1"> soar`;
const HOSTILE_DETAIL = `<script>window.__pwned=1</script>Exports hit USD 999,999,999.`;

const web: Evidence = {
  source_id: "WEB",
  claim: HOSTILE_CLAIM,
  detail: HOSTILE_DETAIL,
  url: "https://news.example.test/tea",
};

const kg: Evidence = {
  source_id: "KG",
  claim: "Tea exports were USD 1.3 billion in 2024.",
  detail: "MATCH (c:Country)-[e:EXPORTS_TO]->() RETURN sum(e.value_usd)",
};

describe("EvidencePanel — a web result", () => {
  it("renders untrusted markup as literal text, never as elements", () => {
    const { container } = render(<EvidencePanel evidence={[web]} />);
    expect(screen.getByText(HOSTILE_CLAIM)).toBeInTheDocument();
    // The snippet is the link text on the WEB path.
    expect(screen.getByRole("link", { name: HOSTILE_DETAIL })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect((window as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("says in words that it is not a CeyNex source", () => {
    render(<EvidencePanel evidence={[web]} />);
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("WEB")).toBeInTheDocument();
    expect(
      within(item).getByText(/not a CeyNex data source, and not used in the answer/),
    ).toBeInTheDocument();
  });

  it("offers no query to show, while a verified source still does", () => {
    render(<EvidencePanel evidence={[kg, web]} />);
    const [kgItem, webItem] = screen.getAllByRole("listitem");
    expect(within(kgItem).getByRole("button", { name: "Show query" })).toBeInTheDocument();
    expect(within(webItem).queryByRole("button")).toBeNull();
  });

  it("opens its link in a new tab without handing the page a window.opener", () => {
    render(<EvidencePanel evidence={[web]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://news.example.test/tea");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("never renders a javascript: URL as a live link", () => {
    // The backend drops non-http(s) URLs before they get here (ceynex-core
    // websearch/providers.py). This pins the second layer in case one slips by.
    render(<EvidencePanel evidence={[{ ...web, url: "javascript:window.__pwned=1" }]} />);
    const href = screen.getByRole("link").getAttribute("href") ?? "";
    expect(href).not.toContain("__pwned");
  });
});
