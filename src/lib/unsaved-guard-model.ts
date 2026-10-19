/**
 * State machine for the "Leave without saving?" prompt raised by closing an
 * editor (as opposed to a router navigation, which react-router tracks).
 * `pending` holds what to run if the user chooses Leave.
 */
export type CloseState = { pending: (() => void) | null }

export type CloseAction =
  | { type: "request"; dirty: boolean; leave: () => void }
  | { type: "stay" }
  | { type: "leave" }
  | { type: "dirty"; dirty: boolean }
  | { type: "navigation" }

export const idleClose: CloseState = { pending: null }

/** A clean form leaves at once, so the caller runs `leave` itself (see `shouldAsk`). */
export function shouldAsk(dirty: boolean): boolean {
  return dirty
}

export function closeReducer(state: CloseState, action: CloseAction): CloseState {
  switch (action.type) {
    case "request":
      return action.dirty ? { pending: action.leave } : state
    case "stay":
    case "leave":
      return state.pending ? idleClose : state
    case "navigation":
      // A router navigation is now blocked and raises the prompt itself. A close request
      // from the same click (an outside click on a link) must not prompt a second time.
      return state.pending ? idleClose : state
    case "dirty":
      // The form went clean (saved or reset) while a request was waiting: it is stale.
      return !action.dirty && state.pending ? idleClose : state
  }
}
