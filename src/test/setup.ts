import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// `globals: false` in vitest.config.ts means testing-library's own
// auto-cleanup registration (which looks for a global `afterEach`) never
// fires, so without this every render() leaks into the next test's DOM.
afterEach(cleanup);
