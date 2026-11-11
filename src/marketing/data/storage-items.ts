/**
 * Everything the signed-in area leaves in a visitor's browser, in one list. The cookie policy (/cookies)
 * renders this list, so the page cannot say something the code does not do.
 *
 * The public pages store nothing (tests/browser/public-layout.test.ts loads them with storage watched).
 * `storage-items.test.ts` scans src/ for cookie and storage use and fails when a file appears that this
 * list and the test do not know about: add the new item here and to that test's list of files.
 *
 * Sources: the code (sidebar.tsx, nav-main.tsx, next-themes, store/auth.store.ts) and, for Clerk, its
 * documentation ("Cookies", production instance cookies) with the live production settings read on
 * 2026-11-11: session lifetime 60 seconds (the token), maximum session lifetime 7 days, Google and email
 * code enabled, CAPTCHA off. The 7 days is the session maximum, not a cookie expiry: Clerk's documentation
 * says the __client cookie's expiry is browser dependent. Clerk's sign-in service runs at clerk.gakinz.com, a subdomain of this site.
 * Clerk loads only on the sign-in page and under /app. Clerk's browser SDK can also set copies of __session and
 * __client_uat with a suffix on the name; the page says so rather than claiming these three are all Clerk sets
 * (not checked in a real signed-in browser). Facts only: this is not legal advice.
 */
export type StoredItem = {
  name: string
  kind: "cookie" | "local storage"
  setBy: "this site" | "Clerk"
  purpose: string
  lasts: string
}

export const STORED_ITEMS: StoredItem[] = [
  {
    name: "sidebar_state",
    kind: "cookie",
    setBy: "this site",
    purpose: "Keeps the side menu open or closed.",
    lasts: "7 days",
  },
  {
    name: "gkos-groups",
    kind: "local storage",
    setBy: "this site",
    purpose: "Remembers which menu groups are open.",
    lasts: "Until you clear it",
  },
  {
    name: "theme",
    kind: "local storage",
    setBy: "this site",
    purpose: "Remembers light or dark, only if you change it.",
    lasts: "Until you clear it",
  },
  {
    name: "gk-auth",
    kind: "local storage",
    setBy: "this site",
    purpose:
      "Your name, email address and role, so the first screen can show who is signed in before the check finishes. It holds no password and no sign-in token.",
    lasts: "Until you sign out. Your name, email and role are then removed (an empty entry stays)",
  },
  {
    name: "__client",
    kind: "cookie",
    setBy: "Clerk",
    purpose:
      "Keeps you signed in with Clerk. Set by Clerk's sign-in service at clerk.gakinz.com, a subdomain of this site, and marked HttpOnly, so scripts on the page cannot read it.",
    lasts: "Kept by your browser while you stay signed in; the session it supports lasts at most 7 days",
  },
  {
    name: "__client_uat",
    kind: "cookie",
    setBy: "Clerk",
    purpose: "Notes when your session last changed, so the page knows whether you are signed in.",
    lasts: "Set by Clerk; the session it describes ends within 7 days",
  },
  {
    name: "__session",
    kind: "cookie",
    setBy: "Clerk",
    purpose: "A short-lived token that proves to this site's server who you are.",
    lasts: "About a minute; Clerk replaces it while you stay signed in",
  },
]
