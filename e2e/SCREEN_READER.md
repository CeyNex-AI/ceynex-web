# Screen-reader pass

WCAG 2.1 AA (SRS 3.2.3, 3.6.1) is checked two ways already. axe-core runs on
every page state (`e2e/a11y.spec.ts`), and the keyboard paths are driven by
pressing keys. Neither is a person hearing the page. This is the script for that
pass, and until it has been run and recorded, `ceynex-core/docs/DEFERRED.md`
lists it as owed.

## Setup

Use one screen reader and one browser, and write down which.

| Platform | Screen reader | Browser |
|---|---|---|
| Linux (the dev machine) | Orca (`sudo pacman -S orca`, toggle with Super+Alt+S) | Firefox or Chrome |
| Windows | NVDA (free) | Firefox or Chrome |
| macOS | VoiceOver (Cmd+F5) | Safari |

**Where to run it.** Use the deployed site (`https://34.47.150.194`; accept the
self-signed certificate once), or `npm run preview` against a local API. Sign in
as any non-admin account for steps 1–12, and as an admin for step 13. Use the
screen reader's default verbosity. A pass means a first-time listener would
understand the page, not that every word matches below.

## The script

Speech in quotes is the text the page provides. How it is voiced varies by
screen reader.

| # | Do | Expect to hear, or find | Result |
|---|---|---|---|
| 1 | Load the login page. Press Tab once. | "Skip to main content" first. Then the fields are labelled "Email" and "Password", the button says what it does, and there is a "Sign up" link. | **Pass.** Full desktop-width tab order confirmed by real keypress: Skip to main content → CeyNex (home) → Login (current) → Sign up → Query → Scenario → Help → Account → Email (edit, blank) → Password (edit, protected, blank) → Sign in (button) → Sign up (link). All labelled correctly, nothing unreachable. |
| 2 | Sign in with a wrong password. | The error is announced without moving focus by hand. | **Pass.** Submitting with a wrong password speaks "alert Incorrect email or password." immediately, with zero manual navigation — confirms a real `role="alert"`/live region, not a silently-rendered message. |
| 3 | Sign in. On **Ask CeyNex**, find the question box. | Its label ("Your question") is read, and the page title names the page. | **Pass on the label** — a real click into the box speaks "form landmark, Your question, edit, has auto complete" (the visible "Ask a question…" is the placeholder, "Your question" is the real accessible name). Page title updates to "Chat · CeyNex". **But found a real bug getting there**: after a successful sign-in (client-side route change, no full reload), keyboard focus is not moved into the new page at all — the very next real Tab press lands on the browser's own address bar, and nothing is announced about the navigation. A screen-reader user has no cue sign-in worked or that they're now on a different page. Filed as ceynex-web#27. |
| 4 | Ask "What is the current price trend for cinnamon?" and wait, without moving. | One line updating politely, "Working. N steps so far.", then one summary such as "Thought for 5.6s · 2 analyses · 8 queries". **Not** every step, and never a Cypher string read aloud. The answer's own text is *not* read as it streams; you hear "Answer ready." once. | **Mostly pass.** Heard exactly: "Working. 1/8/13/15/17/23 steps so far." (6 polite updates, not every one of the 23 real steps, no Cypher ever read), then "Answer ready." once — the answer prose was not read as it streamed. Gap: no "Thought for N.Ns · N analyses · N queries" summary was spoken before "Answer ready" — that detail only becomes available once the trace is manually opened (see step 6). |
| 5 | Move to the answer and read it. | Prose, then the confidence as text ("Moderate confidence · 62%"), never only a colour. The evidence entries are readable, and a WEB entry says it is an unvetted web result. | **Pass**, and better than the minimum: confidence reads as "graphic, Confidence 90 percent, High" (text, not colour-only). Every inline citation is its own button whose accessible name is the *full* source claim ("Source 3: KG, Cinnamon export value moved at -0.1% a year compounded between 2021 and 2025."), not a bare "[3]". The KG-visualisation panel (a canvas, not screen-reader-accessible on its own) has a proper table fallback: "table with 10 rows and 4 columns, caption: The knowledge-graph relationships behind this answer" — same pattern as the forecast-chart fallback in step 7. No WEB-sourced evidence appeared on this particular question to check that specific wording — untested this pass, not failed. |
| 6 | Open the trace ("Thought for…" button). | A list. Each step starts with its status as a word ("Done", "Failed") before its label. | **Found a real, visually-confirmed bug (not screen-reader-specific).** Of 23 steps, most read correctly ("done: Queried the knowledge graph — 0 rows (Export analytics)"), but 4 consecutive steps are completely blank — NVDA reads "done:" four times in a row with nothing after it, and a screenshot confirms the same 4 rows render with only a checkmark and no text for sighted users too. Also: "Language model (?) — 0 in / 0 out (Routing)" appears twice back-to-back (duplicated step, and a literal "(?)" placeholder where a model name should be). Filed as ceynex-web#28. Separately, minor: the toggle button's text runs two labels together with no separator — "Thought for 7.3sShow steps" / "Loading steps…Hide steps" — filed as part of ceynex-web#28. |
| 7 | If the answer has a forecast, find the chart. | The chart itself is skipped (hidden). A table beside it carries the same numbers and can be navigated as a table. | Not run this pass — the cinnamon question used for steps 4-6 declined the forecast (no producer-price series). Needs a question with a real forecast (e.g. "Forecast tea export earnings for the next three years"). |
| 8 | Ask "How are tea and cinnamon exports doing?" | Focus moves to the clarifying question by itself, and it is read. Tab reaches the options, whose pressed or not-pressed state is announced, then "Continue" and a way to just answer. Choosing "cinnamon" and continuing produces a cinnamon answer. | Not run this pass. |
| 9 | Ask anything, then press **Stop** at once. | "Stopping…", then "Stopped. Nothing from this question was saved." Both come without hunting for them. | Not run this pass. |
| 10 | Press **Regenerate** on the latest answer. | "Version 2 of 2". The arrows are "Previous version of this answer" and "Next version of this answer". | Not run this pass. |
| 11 | Optional: cut the network mid-answer (browser dev tools, Offline), then restore it. | "Connection lost — reconnecting (attempt 1 of 3)…", then the answer continues. | Not run this pass. |
| 12 | Open **Account**. | The usage figures are reachable as a table (the bars are hidden). The instructions editor is labelled and says its limit. | Not run this pass. |
| 13 | As an admin, open **Admin** and then the **scenario workbench** (from an answer, or `/scenario`). | Admin: the users list and the audit log read as lists or tables. Workbench: every slider has a label and speaks its value as it moves; "Reset … to its default" says which; a result, or a refusal saying why, is reachable after changing a value. | Not run this pass. |

## Recording it

Fill in the Result column: pass, or what was heard instead. Then note the date,
the screen reader and browser, and a one-line summary under "Verification still
owed by a human" in `ceynex-core/docs/DEFERRED.md`, replacing "it is still owed".
File each failure as its own issue on `ceynex-web`, naming the step.
