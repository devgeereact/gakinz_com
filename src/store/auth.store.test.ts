import { describe, expect, it } from "vitest"
import { migrateAuthState } from "./auth.store"

const user = { id: 1, name: "Owner", email: "owner@example.test", role: "super_admin" as const }

describe("migrateAuthState: what survives from an older stored sign-in (Clerk is the only sign-in, D-057)", () => {
  it("keeps the user and drops a stored session token", () => {
    const migrated = migrateAuthState({ token: "a".repeat(64), user })
    expect(migrated).toEqual({ user })
    expect(migrated).not.toHaveProperty("token")
  })

  it("accepts state that never had a token", () => {
    expect(migrateAuthState({ user })).toEqual({ user })
  })

  it("falls back to signed out for anything unusable", () => {
    for (const bad of [null, undefined, "x", 42, [], { user: null }, { user: "x" }, {}]) {
      expect(migrateAuthState(bad), JSON.stringify(bad)).toEqual({ user: null })
    }
  })
})
