import { Link } from "react-router-dom";
import { COPYRIGHT_NOTICE, SITE_DISCLAIMER } from "../lib/legal";

/**
 * The disclaimer and copyright notice the SRS asks the web application to show
 * (LG-01, LG-07), on every page including sign-in.
 *
 * Printable, unlike the nav: the Query page's "Print report" is how an answer
 * leaves the app on paper, which is where a disclaimer matters most. No role or
 * live region; the one `contentinfo` landmark comes from `<footer>` itself.
 *
 * The link text must not contain "Account", "Menu" or "Close":
 * e2e/helpers.ts's login() finds the signed-in nav by a substring match on those
 * names, and a second match fails every spec in strict mode.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-8 text-xs text-gray-500 leading-relaxed">
        <p className="max-w-3xl">{SITE_DISCLAIMER}</p>
        <p className="shrink-0">
          {COPYRIGHT_NOTICE}
          <span aria-hidden="true"> · </span>
          <Link
            to="/notices"
            className="text-teal-700 hover:text-teal-800 underline underline-offset-2 print:no-underline"
          >
            Notices and data sources
          </Link>
        </p>
      </div>
    </footer>
  );
}
