import path from "node:path";
import { describe, expect, it } from "vitest";
import { packageDir, renderNotices } from "./thirdPartyNotices.ts";

const nm = (...parts: string[]) => path.join("/app", "node_modules", ...parts);

describe("packageDir", () => {
  it("finds a plain package", () => {
    expect(packageDir(nm("react", "cjs", "react.production.js"))).toBe(nm("react"));
  });

  it("keeps a scope with its package", () => {
    expect(packageDir(nm("@reduxjs", "toolkit", "dist", "index.js"))).toBe(nm("@reduxjs", "toolkit"));
  });

  it("takes the innermost package of a nested node_modules", () => {
    expect(packageDir(nm("a", "node_modules", "b", "index.js"))).toBe(nm("a", "node_modules", "b"));
  });

  it("ignores application code and virtual modules", () => {
    expect(packageDir(path.join("/app", "src", "App.tsx"))).toBeNull();
    expect(packageDir("\0vite/preload-helper.js")).toBeNull();
  });
});

describe("renderNotices", () => {
  it("puts each package's licence text under its name, version and licence", () => {
    const text = renderNotices([{ name: "react", version: "19.0.0", license: "MIT", text: "MIT License ..." }]);
    expect(text).toContain("react 19.0.0 (MIT)\n" + "-".repeat(72) + "\nMIT License ...");
  });
});
