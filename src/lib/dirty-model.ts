/**
 * Dirty-state model for unsaved-changes protection.
 *
 * A form is dirty when its current values differ from the last saved (or
 * last loaded) values. Comparison is structural, so reordering object keys
 * does not count as an edit, while changing an array item or a nested field
 * does. `undefined` and a missing key are treated alike.
 */
export function isDirty(current: unknown, baseline: unknown): boolean {
  return !sameValue(current, baseline)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b || a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => sameValue(v, b[i]))
  }
  if (typeof a === "object") {
    const x = a as Record<string, unknown>
    const y = b as Record<string, unknown>
    const keys = new Set([...Object.keys(x), ...Object.keys(y)])
    for (const k of keys) {
      if (!sameValue(x[k], y[k])) return false
    }
    return true
  }
  return false
}

/** The keys whose values differ, for screens that report which section changed. */
export function dirtyKeys<T extends Record<string, unknown>>(current: T, baseline: T): (keyof T)[] {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]) as Set<keyof T>
  return [...keys].filter((k) => !sameValue(current[k], baseline[k]))
}
