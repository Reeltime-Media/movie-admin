"use client";

import { useEffect } from "react";

// Query-param token name the bypass secret is checked against (?ddtk=<secret>),
// so support/eng can still open DevTools in prod without a redeploy.
const BYPASS_SECRET = process.env.NEXT_PUBLIC_DEVTOOLS_BYPASS_SECRET;

/**
 * Best-effort deterrent only — DevTools access is controlled by the browser,
 * not the page, so this cannot actually block a determined user (they can
 * always view-source, curl the API directly, or use a browser/extension this
 * script doesn't run in). It only removes casual entry points:
 *  - right-click and the common keyboard shortcuts (always on, all envs)
 *  - active DevTools detection that clears the console and kicks the tab
 *    away when open (production only, so `next dev` stays debuggable)
 */
export function DevToolsGuard() {
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    const blockKeys = (e: KeyboardEvent) => {
      if (!e.key) return;
      const key = e.key.toLowerCase();
      const modifier = e.ctrlKey || e.metaKey;

      if (key === "f12") {
        e.preventDefault();
        return;
      }
      if (modifier && e.shiftKey && ["i", "j", "c"].includes(key)) {
        e.preventDefault();
        return;
      }
      if (modifier && key === "u") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);

    let cancelled = false;
    if (process.env.NODE_ENV === "production") {
      import("disable-devtool").then(({ default: DisableDevtool }) => {
        if (cancelled) return;
        DisableDevtool({
          md5: BYPASS_SECRET ? DisableDevtool.md5(BYPASS_SECRET) : undefined,
          interval: 500,
          disableMenu: true,
          clearLog: true,
          clearIntervalWhenDevOpenTrigger: true,
          // Default kill behavior tries window.close() first, then redirects
          // here when the tab can't be closed by script (the common case).
          url: "/",
        });
      });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  return null;
}
