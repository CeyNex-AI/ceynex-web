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
| 1 | Load the login page. Press Tab once. | "Skip to main content" first. Then the fields are labelled "Email" and "Password", the button says what it does, and there is a "Sign up" link. | |
| 2 | Sign in with a wrong password. | The error is announced without moving focus by hand. | |
| 3 | Sign in. On **Ask CeyNex**, find the question box. | Its label ("Your question") is read, and the page title names the page. | |
| 4 | Ask "What is the current price trend for cinnamon?" and wait, without moving. | One line updating politely, "Working. N steps so far.", then one summary such as "Thought for 5.6s · 2 analyses · 8 queries". **Not** every step, and never a Cypher string read aloud. The answer's own text is *not* read as it streams; you hear "Answer ready." once. | |
| 5 | Move to the answer and read it. | Prose, then the confidence as text ("Moderate confidence · 62%"), never only a colour. The evidence entries are readable, and a WEB entry says it is an unvetted web result. | |
| 6 | Open the trace ("Thought for…" button). | A list. Each step starts with its status as a word ("Done", "Failed") before its label. | |
| 7 | If the answer has a forecast, find the chart. | The chart itself is skipped (hidden). A table beside it carries the same numbers and can be navigated as a table. | |
| 8 | Ask "How are tea and cinnamon exports doing?" | Focus moves to the clarifying question by itself, and it is read. Tab reaches the options, whose pressed or not-pressed state is announced, then "Continue" and a way to just answer. Choosing "cinnamon" and continuing produces a cinnamon answer. | |
| 9 | Ask anything, then press **Stop** at once. | "Stopping…", then "Stopped. Nothing from this question was saved." Both come without hunting for them. | |
| 10 | Press **Regenerate** on the latest answer. | "Version 2 of 2". The arrows are "Previous version of this answer" and "Next version of this answer". | |
| 11 | Optional: cut the network mid-answer (browser dev tools, Offline), then restore it. | "Connection lost — reconnecting (attempt 1 of 3)…", then the answer continues. | |
| 12 | Open **Account**. | The usage figures are reachable as a table (the bars are hidden). The instructions editor is labelled and says its limit. | |
| 13 | As an admin, open **Admin** and then the **scenario workbench** (from an answer, or `/scenario`). | Admin: the users list and the audit log read as lists or tables. Workbench: every slider has a label and speaks its value as it moves; "Reset … to its default" says which; a result, or a refusal saying why, is reachable after changing a value. | |

## Recording it

Fill in the Result column: pass, or what was heard instead. Then note the date,
the screen reader and browser, and a one-line summary under "Verification still
owed by a human" in `ceynex-core/docs/DEFERRED.md`, replacing "it is still owed".
File each failure as its own issue on `ceynex-web`, naming the step.
