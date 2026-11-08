/**
 * The message after "Share" on the Files screen. A link the server kept because the file is on a public
 * Work page has no expiry (files.php, K-128), so it must not say "valid 7 days".
 */
export function shareNotice(o: { copied: boolean; expiresAt: string | null; days: number }): string {
  const verb = o.copied ? "copied" : "created"
  if (o.expiresAt === null) return `Share link ${verb}. It does not expire: this file is shown on a public page.`
  return `Share link ${verb} (valid ${o.days} ${o.days === 1 ? "day" : "days"}).`
}
