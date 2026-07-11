/**
 * These tests just test the database connection and the database access functions.
 * They do not test the actual functionality of the application.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as dbtools from './dbtesttools.js'


describe("A conection to the database", function () {

  test("can be established", async function () {
    let client = await dbtools.getPostgresClient(dbtools.rootConfig)
    assert.ok(client)
    await dbtools.closePostgresClient(client)
  })
})

describe("A test database", function () {

  test("can be created and destroyed", async function () {
    let client = await dbtools.createTestDBAndReturnClient('testdb')
    assert.ok(client)
    let dbnames = await dbtools.getDatabaseNames(client)
    assert.ok(dbnames.includes('testdb'))
    await dbtools.closePostgresClient(client)
    await dbtools.dropTestDB('testdb')
  })
})
