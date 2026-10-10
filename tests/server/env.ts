/**
 * Settings for the synthetic server test path. Everything here points at the
 * local machine: a throwaway database whose name must end in `_test`, a PHP
 * built-in server on 127.0.0.1 and a fake payment provider. Nothing can reach
 * the live API, the live database, a mailbox or a real payment provider.
 */
import os from "node:os"
import path from "node:path"

export const DB_HOST = process.env.GK_TEST_DB_HOST ?? "localhost"
export const DB_PORT = process.env.GK_TEST_DB_PORT ?? "3306"
export const DB_NAME = process.env.GK_TEST_DB ?? "gakinz_test"
export const DB_USER = process.env.GK_TEST_DB_USER ?? os.userInfo().username
export const DB_PASS = process.env.GK_TEST_DB_PASS ?? ""

export const PHP_PORT = 5191
export const PROVIDER_PORT = 5192
export const BASE = `http://127.0.0.1:${PHP_PORT}`
export const PROVIDER_BASE = `http://127.0.0.1:${PROVIDER_PORT}`

/** Synthetic secrets. They only ever exist in the temporary config below. */
export const STRIPE_SECRET = "sk_test_synthetic_only"
export const WEBHOOK_SECRET = "whsec_synthetic_test_only"

export const WORK_DIR = path.join(os.tmpdir(), "gakinz-server-test")
/** The fake provider appends every request it receives to this file. */
export const PROVIDER_LOG = path.join(WORK_DIR, "provider-requests.jsonl")

export function assertSafeTarget(): void {
  if (!["localhost", "127.0.0.1"].includes(DB_HOST)) {
    throw new Error(`Refusing to run server tests against non-local database host "${DB_HOST}".`)
  }
  if (!/_test$/.test(DB_NAME)) {
    throw new Error(`Refusing to use database "${DB_NAME}": test databases must end in _test.`)
  }
}
