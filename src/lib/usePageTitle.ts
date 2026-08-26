import { useEffect } from "react";

/**
 * index.html's <title> never changes across client-side route navigation on
 * its own -- in a single-page app that's a real WCAG 2.4.2 gap, and it's
 * also the primary way many screen readers announce "you're on a new page"
 * after a route change, since there's no full page load to re-announce it.
 */
export default function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · CeyNex`;
  }, [title]);
}
