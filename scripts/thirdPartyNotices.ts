/**
 * Emits `third-party-licenses.txt` next to the production bundle: every npm
 * package whose code actually ships in it, with its version, declared licence
 * and licence text. The Notices page links to it.
 *
 * SRS "Copyright and Trademark": where the system incorporates open-source
 * components it must comply with each one's attribution and notice terms. MIT,
 * ISC and BSD all require the copyright notice to travel with the code, and a
 * minified bundle strips the per-file headers that would otherwise carry it.
 *
 * Read from the bundler's own module graph rather than from package.json,
 * because what ships is decided there: react-router-dom and recharts sit under
 * devDependencies yet are bundled, while vitest and eslint are not.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

interface Notice {
  name: string;
  version: string;
  license: string;
  text: string;
}

const MARKER = `node_modules${path.sep}`;
const LICENCE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i;

/** `.../node_modules/a/node_modules/@scope/b/x.js` -> `.../node_modules/a/node_modules/@scope/b`. */
export function packageDir(moduleId: string): string | null {
  if (moduleId.startsWith("\0")) return null; // virtual modules, e.g. vite's preload helper
  const at = moduleId.lastIndexOf(MARKER);
  if (at === -1) return null;
  const rest = moduleId.slice(at + MARKER.length).split(path.sep);
  const depth = rest[0]?.startsWith("@") ? 2 : 1;
  if (rest.length <= depth) return null;
  return moduleId.slice(0, at + MARKER.length) + rest.slice(0, depth).join(path.sep);
}

function readNotice(dir: string): Notice | null {
  // Paths come from the bundler's module graph, never from user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as {
    name?: string;
    version?: string;
    license?: string | { type?: string };
    repository?: string | { url?: string };
  };
  if (!manifest.name) return null;
  const license =
    typeof manifest.license === "string" ? manifest.license : (manifest.license?.type ?? "UNKNOWN");
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const file = readdirSync(dir).find((entry) => LICENCE_FILE.test(entry));
  const repository =
    typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;
  const text = file
    ? // eslint-disable-next-line security/detect-non-literal-fs-filename
      readFileSync(path.join(dir, file), "utf8").trim()
    : `No licence file ships in this package. Declared licence: ${license}.` +
      (repository ? ` Source: ${repository}` : "");
  return { name: manifest.name, version: manifest.version ?? "?", license, text };
}

export function renderNotices(notices: Notice[]): string {
  const header = [
    "Third-party software in the CeyNex web application",
    "",
    "Each package below is included in the production JavaScript bundle. Its",
    "licence text follows its name, as that licence requires.",
    "",
  ];
  const body = notices.flatMap((n) => [
    "=".repeat(72),
    `${n.name} ${n.version} (${n.license})`,
    "-".repeat(72),
    n.text,
    "",
  ]);
  return [...header, ...body].join("\n");
}

export function thirdPartyNotices(): Plugin {
  return {
    name: "ceynex-third-party-notices",
    apply: "build",
    generateBundle(_options, bundle) {
      const dirs = new Set<string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const id of output.moduleIds) {
          const dir = packageDir(id);
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          if (dir && existsSync(path.join(dir, "package.json"))) dirs.add(dir);
        }
      }
      const notices = [...dirs]
        .map(readNotice)
        .filter((n): n is Notice => n !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.emitFile({
        type: "asset",
        fileName: "third-party-licenses.txt",
        source: renderNotices(notices),
      });
    },
  };
}
