/**
 * The keyboard paths a sighted keyboard-only reader takes (SRS UR-05..UR-08;
 * the "keyboard-only walkthrough" the testing handoff left open). Automated,
 * so they hold on every run; a person tabbing through the app is still owed and
 * e2e/SCREEN_READER.md is the script for the screen-reader half.
 */

import { expect, login, test } from "./helpers";
import type { Page } from "@playwright/test";

/** Help: a signed-in page with no autofocus. /query focuses the chat composer
 * on load, so its first Tab starts there rather than at the top. */
async function signedInAtTheTop(page: Page): Promise<void> {
  await login(page);
  await page.goto("/help");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("the first Tab is the skip link, and it moves focus into the page", async ({ page }) => {
  await signedInAtTheTop(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible(); // sr-only until focused
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("focus is always visible on the nav links", async ({ page, isMobile }) => {
  test.skip(isMobile, "below md the links sit behind the menu toggle");
  await signedInAtTheTop(page);
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // logo link
  for (const name of ["Query", "Scenario", "Help", "Account"]) {
    await page.keyboard.press("Tab");
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toBeFocused();
    const ring = await link.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    expect(ring, `${name} has no visible focus indicator`).toBe(true);
  }
});

test("the notices page is reachable from the footer by keyboard alone", async ({ page }) => {
  await page.goto("/");
  const notices = page.getByRole("link", { name: "Notices and data sources" });
  for (let i = 0; i < 40 && !(await notices.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(notices).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Notices" })).toBeVisible();
});
