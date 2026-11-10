import { describe, expect, it } from "vitest"
import { dumpCompleted, dumpFacts, schemaTables, unsafeStatements } from "./restore-drill.mjs"

describe("restore-drill helpers", () => {
  it("reads the engine, database and server version from a dump header", () => {
    const head = "-- MariaDB dump 10.19-11.4.13-MariaDB, for Linux (x86_64)\n--\n-- Host: localhost    Database: some_db\n-- ---\n-- Server version\t11.4.13-MariaDB-cll-lve\n"
    expect(dumpFacts(head)).toEqual({ database: "some_db", serverVersion: "11.4.13-MariaDB-cll-lve", engine: "MariaDB" })
  })

  it("copes with a header that says nothing", () => {
    expect(dumpFacts("")).toEqual({ database: null, serverVersion: null, engine: null })
  })

  it("lists the tables schema.sql creates", () => {
    expect(schemaTables("CREATE TABLE IF NOT EXISTS `a` (x int);\nCREATE TABLE IF NOT EXISTS b (y int);\n-- CREATE TABLE IF NOT EXISTS c")).toEqual(["a", "b"])
  })

  it("refuses a dump that names a database to use, create or drop, and accepts an ordinary one", () => {
    expect(unsafeStatements("CREATE TABLE `a` (x int);\nINSERT INTO a VALUES (1);\n/*!40101 SET NAMES utf8mb4 */;")).toEqual([])
    expect(unsafeStatements("DROP DATABASE IF EXISTS `real_local`;\nCREATE DATABASE `real_local`;\nUSE `real_local`;")).toHaveLength(3)
    expect(unsafeStatements("  use other;")).toHaveLength(1)
  })

  it("tells a complete dump from a truncated or empty one", () => {
    expect(dumpCompleted("CREATE TABLE a (x int);\n-- Dump completed on 2026-10-30  0:56:11\n")).toBe(true)
    expect(dumpCompleted("CREATE TABLE a (x int);\nINSERT INTO a VALUES (1),(2")).toBe(false)
    expect(dumpCompleted("")).toBe(false)
  })
})
