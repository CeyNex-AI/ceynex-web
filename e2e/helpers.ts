import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The accounts the specs sign in as. RBAC has no fixed demo accounts, so
 * e2e/global-setup.ts creates the policymaker through signup, and the admin comes
 * from the API's own `CEYNEX_BOOTSTRAP_ADMIN` seed (see e2e/README.md).
 */
export const DEMO = { email: "policymaker@ceynex.dev", password: "ceynex-demo" };
export const ADMIN = { email: "admin@ceynex.dev", password: "ceynex-demo" };

/** Where `src/lib/tokenStorage.ts` keeps the session. */
const TOKEN_KEY = "ceynex_token";

function tokenFor(who: { email: string }): string {
  const token = who.email === ADMIN.email ? process.env.E2E_TOKEN_ADMIN : process.env.E2E_TOKEN_DEMO;
  if (!token) throw new Error(`No token for ${who.email}: e2e/global-setup.ts did not run.`);
  return token;
}

/**
 * Start signed in the way a reloaded tab does. A real token from the API
 * (e2e/global-setup.ts signs each account in once) goes where
 * `tokenStorage.ts` keeps it, and the app checks it against `/api/auth/me`
 * exactly as it checks any stored session. The form itself is exercised by
 * `loginThroughTheForm`, in a11y.spec.ts's login-page test.
 */
export async function login(page: Page, who = DEMO): Promise<void> {
  await page.goto("/");
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [TOKEN_KEY, tokenFor(who)]);
  await page.goto("/query");
  // The nav shows its links only to a signed-in reader, so this fails fast if
  // the token was refused rather than when a spec later misses the composer.
  await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
  await expect(page).toHaveURL(/\/query$/);
}

/** Sign in through the login form, as a reader does. */
export async function loginThroughTheForm(page: Page, who = DEMO): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL("**/query");
}

/** Type a question into the chat composer and submit it. */
export async function ask(page: Page, question: string): Promise<void> {
  const input = page.getByLabel("Your question");
  await expect(input).toBeEnabled();
  await input.fill(question);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
}

/** Wait for the live turn to finish: the composer is enabled again. */
export async function answered(page: Page): Promise<void> {
  await expect(page.getByLabel("Your question")).toBeEnabled({ timeout: 90_000 });
}

/**
 * Run axe on the current page state. `serious` and `critical` fail; `moderate`
 * and below are printed so they are seen rather than silently swallowed.
 */
export async function expectNoSeriousA11yViolations(page: Page, label: string): Promise<void> {
  // Let colour transitions finish (Tailwind's transition-colors is 150 ms):
  // axe samples computed colours, and a button caught mid-fade is a false
  // contrast failure that no reader would ever see.
  await page.waitForTimeout(250);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const lesser = results.violations.filter((v) => !serious.includes(v));
  for (const v of lesser) {
    console.log(`[axe:${label}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
  }
  expect(
    serious.map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help}\n  ` +
        v.nodes
          .map((n) => `${n.target.join(" ")}\n    ${n.html.slice(0, 400)}\n    ${n.failureSummary ?? ""}`)
          .join("\n  "),
    ),
    `axe found serious/critical violations on ${label}`,
  ).toEqual([]);
}
