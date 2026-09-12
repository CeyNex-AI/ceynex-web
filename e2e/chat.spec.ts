/**
 * The conversational surface, end to end, against a degraded backend.
 *
 * Every step here is a thing the execution plan said had "never been opened in
 * a browser": the live trace, a follow-up, Export and Share, the version
 * switcher after Regenerate, and Stop in both of its honest forms.
 */

import { expect, test } from "@playwright/test";
import { answered, ask, login } from "./helpers";

const FIRST = "Which country takes the largest share of Sri Lanka's tea exports?";

test.describe("a conversation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("streams a trace, answers, and takes a follow-up without a new fan-out", async ({ page }) => {
    await ask(page, FIRST);

    // The trace is on screen while the graph runs, before any answer exists.
    const trace = page.getByRole("button", { name: /Working…/ });
    await expect(trace).toBeVisible();

    await answered(page);
    // The finished turn is folded into the transcript with its collapsed summary.
    await expect(page.getByRole("button", { name: /Thought for/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Show steps/ }).first()).toBeVisible();
    // And the steps are real: opening them, then a row, shows the Cypher that ran.
    await page.getByRole("button", { name: /Thought for/ }).first().click();
    await page.getByRole("button", { name: "query", exact: true }).first().click();
    await expect(page.getByText(/MATCH/).first()).toBeVisible();

    // A follow-up is classified; on the degraded path a discussion is answered
    // from the previous turn and says it needs the model — but it does not
    // re-run the graph, which the trace shows: no "Working…" fan-out summary
    // with agent steps, just the classification and the discussion verdict.
    await ask(page, "Explain that in plain terms.");
    await answered(page);
    const turns = page.getByRole("button", { name: /Thought for|steps?\b|Show steps/ });
    await expect(turns).toHaveCount(2);
  });

  test("share links belong to the conversation they were minted for", async ({ page }) => {
    await ask(page, FIRST);
    await answered(page);

    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    const link = page.getByText(/Read-only link:/);
    await expect(link).toBeVisible();
    const firstLink = (await link.textContent()) ?? "";

    // A second conversation must not inherit the first one's link.
    await page.getByRole("button", { name: "New chat" }).click();
    await ask(page, "How fast have cinnamon exports grown over the last five years?");
    await answered(page);
    await expect(page.getByRole("button", { name: "Share", exact: true })).toBeVisible();
    await expect(page.getByText(/Read-only link:/)).toHaveCount(0);

    // And going back finds the first one's link again, unchanged.
    await page.getByRole("navigation", { name: "Past conversations" })
      .getByRole("button", { name: /tea|Untitled|Which country/i }).first().click();
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    await expect(page.getByText(/Read-only link:/)).toHaveText(firstLink);
  });

  test("regenerate keeps the old answer as a version and searches news for the real question", async ({ page }) => {
    await ask(page, FIRST);
    await answered(page);

    const newsRequest = page.waitForRequest(
      (request) => request.url().includes("/api/news/search"),
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: /Regenerate/ }).click();
    const request = await newsRequest;
    const asked = new URL(request.url()).searchParams.get("q") ?? "";
    expect(asked, "the news search must be for the question, not an empty string").toBe(FIRST);

    await answered(page);
    await expect(page.getByText(/Version 2 of 2/)).toBeVisible();
    await page.getByRole("button", { name: "Previous version of this answer" }).click();
    await expect(page.getByText(/Version 1 of 2/)).toBeVisible();
  });

  test("Stop pressed at once still reaches the server, and the turn is cancelled", async ({ page }) => {
    const cancel = page.waitForRequest((request) => request.url().includes("/cancel"));
    await ask(page, FIRST);
    await page.getByRole("button", { name: "Stop" }).click();
    await cancel;
    await expect(page.getByText("Stopped. Nothing from this question was saved.")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Stopped listening/)).toHaveCount(0);
  });

  test("when the stop request cannot be delivered, the page says the answer may still be saved", async ({ page }) => {
    await page.route("**/api/chat/turns/*/cancel", (route) => route.abort("failed"));
    await ask(page, FIRST);
    await page.getByRole("button", { name: "Stop" }).click();
    const notice = page.getByText(/Stopped listening\. The stop request did not reach the server/);
    await expect(notice).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Stopped. Nothing from this question was saved.")).toHaveCount(0);

    // The server did finish and store it; the offered reload finds the answer.
    await page.unroute("**/api/chat/turns/*/cancel");
    await page.waitForTimeout(8_000);
    await page.getByRole("button", { name: "Reload conversation" }).click();
    await expect(page.getByRole("button", { name: /Show steps|Thought for/ }).first()).toBeVisible();
  });

  test("Export offers the conversation as Markdown", async ({ page }) => {
    await ask(page, FIRST);
    await answered(page);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^ceynex-conversation-\d+\.md$/);
  });
});
