import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'

describe('Testing access to logincodes,', () => {
  const testDBName = 'testlogincodes'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  test('a new login code can be created and deleted', async () => {
    let loginCode = {
      email: 'dario@test.com',
      code: '123456',
      expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    }
    let createdLoginCode = await dbaccess.createLoginCode(dbclient, loginCode)
    assert.strictEqual(createdLoginCode.email, loginCode.email)
    assert.strictEqual(createdLoginCode.code, loginCode.code)
    assert.ok(createdLoginCode.expires_at)

    let deleted = await dbaccess.deleteLoginCode(dbclient, createdLoginCode.email, createdLoginCode.code)
    assert.strictEqual(deleted, true)
  })

  describe('when 2 login codes are created,', () => {
    let loginCode1, loginCode2
    before(async () => {
      let res = await dbtools.query(
        dbclient,
        `
                INSERT INTO "login_codes" (email, code, expires_at, created_at)
                VALUES ('dario@test.com', '123456', NOW() + INTERVAL '5 minutes', NOW())
                RETURNING *`,
      )
      loginCode1 = res.rows[0]

      res = await dbtools.query(
        dbclient,
        `
                    INSERT INTO "login_codes" (email, code, expires_at, created_at)
                    VALUES ('sofia@test.com', '654321', NOW() + INTERVAL '5 minutes', NOW())
                    RETURNING *`,
      )
      loginCode2 = res.rows[0]
    })

    test('all login codes can be retrieved', async function () {
      let loginCodes = await dbaccess.getLoginCodes(dbclient, null)
      assert.strictEqual(loginCodes.length, 2, 'Expected exactly 2 login codes')
    })

    test('login code for dario@test.com/123456 can be retrieved', async function () {
      let loginCodes = await dbaccess.getLoginCodes(dbclient, { email: 'dario@test.com', code: '123456' })
      assert.strictEqual(loginCodes.length, 1, 'Expected exactly 1 login code')
      assert.strictEqual(loginCodes[0].email, 'dario@test.com')
    })
  })
})
