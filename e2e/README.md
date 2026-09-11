# End-to-end and accessibility checks

`npm run e2e` drives the real app in Chromium (Playwright) and runs axe-core on
every page state it reaches. It needs the backend up — and, for a run that is
free and repeatable, **degraded**: with no model key the trace, the gate, Stop,
Regenerate and the workbench all behave deterministically, and the assertions
here are written to hold on that path (a degraded answer carries figures and
evidence and says it has no model-written prose).

```bash
# 1. the data stack, from ceynex-core
make up

# 2. the API, degraded, on 8079 (8000 is not always free on a dev machine)
cd ../ceynex-core
OPENAI_API_KEY= OPENROUTER_API_KEY= .venv/bin/uvicorn ceynex.api.main:app --port 8079

# 3. the checks — the bundle is built and served for you (vite preview on
#    4173), proxying to 8079
cd ../ceynex-web
npm run e2e
```

`VITE_API_TARGET` moves the backend, `E2E_BASE_URL` points at a server you
already have running (the suite drives the production bundle, not the dev
server, whose on-demand dependency optimisation reloads pages mid-test). Failures keep a trace and a screenshot under
`e2e/results/`; `e2e/report/` is the HTML report.

What is asserted, and what is not: axe's `serious` and `critical` findings fail
the run and `moderate` ones are printed; keyboard operability of the trace, the
clarification card and the citation focus is exercised by pressing keys; the
reduced-motion project asserts the trace's pulse is not running. **None of this
is a screen-reader pass.** Implementation is not verification, and a human with
NVDA or VoiceOver is still owed.
