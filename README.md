# ceynex-web

The web front end of **CeyNex**, a multi-agent decision intelligence platform for Sri Lanka's export economy. Users ask questions about agriculture and apparel exports in plain English, either one at a time or in a conversation. Each answer comes with:

- an evidence panel that shows the source and the exact query behind every figure;
- a confidence score with its breakdown;
- for forecasts, a chart with an 80% prediction interval.

Group 07, Project P16, CS3501 Data Science and Engineering Project, University of Moratuwa.
Live: <https://ceynex.cc>. The backend is [`ceynex-core`](https://github.com/CeyNex-AI/ceynex-core), and the production image is built by [`ceynex-infra`](https://github.com/CeyNex-AI/ceynex-infra).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4 and React Router 7. Recharts draws the forecast charts and Cytoscape draws the knowledge-graph panel. Unit tests use Vitest with Testing Library and jsdom. End-to-end and accessibility checks use Playwright with axe-core.

## Pages

| Route | Page | Who |
|---|---|---|
| `/` | Sign in | everyone |
| `/signup` | Create an account (researcher, exporter or policymaker) | everyone |
| `/query` | Query workspace and chat: questions, streamed answers, reasoning trace, evidence, confidence, forecasts, news, history | signed in |
| `/scenario` | Scenario workbench: tariff, FX and demand shocks with sourced elasticities | signed in |
| `/account` | Password, e-mail, notification preferences, API keys, custom instructions, usage | signed in |
| `/admin` | Users and roles, data freshness, ingest runs, data-quality flags, model registry and retrain, LLM status and spend, audit log, site theme | admin |
| `/help` | How to ask questions, how to read confidence, data sources, FAQ | signed in |
| `/shared/:token` | Read-only view of a shared conversation | anyone with the link |
| `/notices` | Disclaimer, copyright and third-party licences | everyone |

## Features

- **Streaming chat.** Answers arrive over Server-Sent Events (`lib/sse.ts`, `lib/streamChat.ts`). A dropped stream resumes from the last event it received. Users can stop a turn, regenerate it, follow up with a suggested chip, and answer a clarifying question card.
- **Reasoning trace.** `ReasoningTrace` shows the plan and each agent's progress live.
- **Evidence and citations.**
  - `EvidencePanel` lists every source with an expandable "Show query".
  - `CitedAnswer` links each `[n]` marker in the answer to its evidence entry.
  - `AnswerDisclaimer` labels answers that were generated in degraded mode.
- **Confidence.**
  - `ConfidenceBadge` shows the score as Very low, Low, Moderate or High.
  - `ConfidenceBreakdown` explains the staleness, data-quality and coverage penalties behind the score.
  - `FreshnessRibbon` warns when a source is stale.
- **Forecasts.** `ForecastChart` shows the history, the point forecast and the 80% interval band.
- **Knowledge graph.** `KnowledgeGraphPanel` expands the trade graph around the answer's countries and products.
- **News.** `NewsPanel` and `TrendingNews` show relevant GDELT headlines next to the answer.
- **Conversations.** A sidebar lists past conversations. Users can rename, delete, share, export a transcript, and rate answers.
- **Accounts.** Sign-up with a password-strength meter that checks breached passwords via k-anonymity. Roles control which pages appear. `RequireAuth` guards routes and remembers the page a user was redirected from.
- **Admin console.** Covers user management, a data-freshness card, data-quality flag resolution, model retraining, LLM usage and spend by role, the audit log, and the site theme (classic or Signal Deck).

## Project layout

```
src/
  pages/         one file per route (Query, QueryWorkspace, Chat, ScenarioWorkbench,
                 Account, Admin, Help, Login, Signup, SharedConversation, Notices, NotFound)
  components/    EvidencePanel, ForecastChart, ConfidenceBadge, ReasoningTrace,
                 KnowledgeGraphPanel, NewsPanel, ConversationSidebar, ClarifyCard, ...
  lib/           typed API clients (queryApi, chatApi, adminApi, accountApi, graphApi,
                 newsApi, scenarioApi, ...), apiFetch (auth header, 401 handling),
                 SSE parser and resume loop, auth context and token storage,
                 roles, confidence labels, theme, legal text
  types/         response types shared by the pages
e2e/             Playwright specs: a11y, chat, clarify, keyboard, scenario
scripts/         third-party licence notices generator
public/          logo and favicon
```

## Getting started

Node 22 is recommended, matching the production build image.

```bash
npm install
npm run dev              # http://127.0.0.1:5173
```

The dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`. Start the backend from `ceynex-core` first:

```bash
cd ../ceynex-core
make up && CEYNEX_BOOTSTRAP_ADMIN=admin@example.com:change-me \
  uvicorn ceynex.api.main:app --port 8000
```

If the backend runs elsewhere, set `VITE_API_TARGET` in the environment or in `.env.local`:

```bash
VITE_API_TARGET=http://127.0.0.1:8079 npm run dev
```

The production bundle never contains a backend address. nginx in `ceynex-infra` serves the bundle and proxies `/api` to the API container on the same origin, so no CORS is needed.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | `tsc -b` type check, then the production bundle in `dist/` |
| `npm run preview` | Serve the built bundle on port 4173 |
| `npm run lint` | ESLint (with `eslint-plugin-security`), zero warnings allowed |
| `npm test` | Vitest unit tests (SSE parser, resume loop, confidence, roles, components) |
| `npm run coverage` | Unit tests with coverage |
| `npm run e2e` | Playwright + axe against a running app; see [`e2e/README.md`](e2e/README.md) |

## Quality checks

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request:

| Job | Checks |
|---|---|
| lint | ESLint |
| test | Vitest with coverage |
| lighthouse | Lighthouse CI on `/`, `/signup` and `/notices`. Accessibility must score 0.9 or more; best practices and performance warn below 0.8 and 0.5. |
| build | Type check and production build |
| security | `npm audit --audit-level=high` and a gitleaks scan of the history |

Accessibility work goes beyond CI. The Playwright suite runs axe-core on every page state it reaches, including mobile viewports and sign-up. A keyboard-only spec covers the main flows, and a manual NVDA screen-reader pass is recorded in [`e2e/SCREEN_READER.md`](e2e/SCREEN_READER.md).

## Deployment

Production is built by `ceynex-infra/frontend/Dockerfile`. A `node:22-alpine` stage runs `npm ci && npm run build`, and an `nginx:1.27-alpine` stage serves `dist/` over HTTPS and proxies `/api` and `/health` to `ceynex-api`. To redeploy, pull this repo on the VM, then run `docker compose build && docker compose up -d` in `ceynex-infra/frontend`.

## Team

Front end: Dhinanjaya Fernando (230181J), with contributions from Thisen Ekanayake (230170B). Team: Senindu Dinapura (230151T). Supervisor: Dr. Chathuranga Hettiarachchi, University of Moratuwa.
