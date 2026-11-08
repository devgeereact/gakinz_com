/**
 * A change to one project (status or stage) must show in the list AND on the open board, which holds its
 * own copy in `selected`. Updating only the list left the board's status dropdown showing the old value.
 */
export function patchProject<P extends { id: number }>(
  list: P[],
  selected: P | null,
  id: number,
  patch: Partial<P>,
): { list: P[]; selected: P | null } {
  return {
    list: list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    selected: selected && selected.id === id ? { ...selected, ...patch } : selected,
  }
}
