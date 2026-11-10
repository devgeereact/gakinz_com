import { describe, expect, it } from "vitest"
import { dumpFacts, schemaTables } from "./restore-drill.mjs"

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
})
