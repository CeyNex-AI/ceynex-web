/**
 * axe-core over every page state a reader reaches, plus the keyboard paths
 * that an automated scanner cannot judge. Runs twice: once as is, once with
 * the OS reduced-motion preference, where the trace's pulse must not animate.
 */

import { expect, test } from "@playwright/test";
import {
  ADMIN,
  answered,
  ask,
  expectNoSeriousA11yViolations,
  login,
  loginThroughTheForm,
} from "./helpers";

test("login page", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousA11yViolations(page, "login");
  // The one spec that signs in through the form; the rest start signed in.
  await loginThroughTheForm(page);
});

test("chat: empty, streaming, answered, and a follow-up", async ({ page }) => {
  await login(page);
  await expectNoSeriousA11yViolations(page, "chat empty");

  await ask(page, "Which country takes the largest share of Sri Lanka's tea exports?");
  await expect(page.getByRole("button", { name: /Working…/ })).toBeVisible();
  await expectNoSeriousA11yViolations(page, "chat streaming");

  // Reduced motion: nothing pulses. (The default project sees the animation.)
  const pulsing = page.locator(".motion-safe\\:animate-pulse");
  if (await pulsing.count()) {
    const names = await pulsing.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).animationName),
    );
    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    if (reduced) expect(names.every((n) => n === "none")).toBe(true);
  }

  await answered(page);
  await expectNoSeriousA11yViolations(page, "chat answered");

  // Keyboard: the trace toggle is reachable and operable.
  const toggle = page.getByRole("button", { name: /Thought for|Show steps/ }).first();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expectNoSeriousA11yViolations(page, "chat trace open");

  await ask(page, "Explain that in plain terms.");
  await answered(page);
  await expectNoSeriousA11yViolations(page, "chat follow-up");
});

test("chat: the clarification card", async ({ page }) => {
  await login(page);
  await ask(page, "How are tea and cinnamon exports doing?");
  await expect(page.getByRole("group", { name: /tea and cinnamon/ })).toBeVisible();
  await expectNoSeriousA11yViolations(page, "clarify card");
});

test("account, usage and instructions", async ({ page }) => {
  await login(page);
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1, name: "Account", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yViolations(page, "account");
});

test("admin", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Admin", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectNoSeriousA11yViolations(page, "admin");
});

test("scenario workbench", async ({ page }) => {
  await login(page);
  await page.goto("/scenario");
  await expect(page.getByRole("status")).toHaveText(/Recomputed|Not simulated/, { timeout: 30_000 });
  await expectNoSeriousA11yViolations(page, "scenario");
});

test("help and not-found", async ({ page }) => {
  await login(page);
  await page.goto("/help");
  await expectNoSeriousA11yViolations(page, "help");
  await page.goto("/no-such-page");
  await expectNoSeriousA11yViolations(page, "not found");
});

test("a shared, read-only transcript", async ({ page, browser }) => {
  await login(page);
  await ask(page, "Which country takes the largest share of Sri Lanka's tea exports?");
  await answered(page);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const text = (await page.getByText(/Read-only link:/).textContent()) ?? "";
  const url = text.replace("Read-only link:", "").trim();
  expect(url).toMatch(/\/shared\//);

  // A fresh context: no token, no account — the evaluator's view.
  const context = await browser.newContext();
  const anonymous = await context.newPage();
  await anonymous.goto(url);
  await expect(anonymous.getByRole("heading").first()).toBeVisible();
  await expectNoSeriousA11yViolations(anonymous, "shared transcript");
  await context.close();
});
