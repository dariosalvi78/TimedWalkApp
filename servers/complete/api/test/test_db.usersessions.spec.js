import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import * as dbaccess from '../dbaccess/dbaccess.js'

describe('Testing db access to user sessions,', () => {
  const testDBName = 'testusersessions'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  describe('when 2 users exists', () => {
    let user1, user2
    before(async () => {
      let res = await dbtools.query(
        dbclient,
        `
                INSERT INTO "users" (role, email, created_at, last_login_at)
                VALUES ('clinician', 'sofia@mau.se', NOW(), NOW())
                RETURNING *`,
      )
      user1 = res.rows[0]

      res = await dbtools.query(
        dbclient,
        `
                    INSERT INTO "users" (role, email, created_at, last_login_at)
                    VALUES ('clinician', 'anthony@mau.se', NOW(), NOW())
                    RETURNING *`,
      )
      user2 = res.rows[0]
    })

    test('a new user session can be created and deleted', async () => {
      let userSession = {
        session_id: 'test_session_id',
        user_id: user1.id,
        csfr_code: 'test_csrf_token',
        expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      }
      let createdUserSession = await dbaccess.createUserSession(dbclient, userSession)
      assert.strictEqual(createdUserSession.session_id, userSession.session_id)
      assert.strictEqual(createdUserSession.user_id, userSession.user_id)
      assert.ok(createdUserSession.expires_at)

      let deleted = await dbaccess.deleteUserSession(dbclient, createdUserSession.session_id)
      assert.strictEqual(deleted, true)
    })

    test('all user sessions can be retrieved', async function () {
      let userSession1 = {
        session_id: 'test_session_id_1',
        user_id: user1.id,
        csfr_code: 'test_csrf_token_1',
        expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      }
      await dbaccess.createUserSession(dbclient, userSession1)

      let userSession2 = {
        session_id: 'test_session_id_2',
        user_id: user2.id,
        csfr_code: 'test_csrf_token_2',
        expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      }
      await dbaccess.createUserSession(dbclient, userSession2)

      let userSessions = await dbaccess.getUserSessions(dbclient, null)
      assert.strictEqual(userSessions.length, 2, 'Expected exactly 2 user sessions')
    })

    test('user session for test_session_id_1 can be retrieved', async function () {
      let userSessions = await dbaccess.getUserSessions(dbclient, { session_id: 'test_session_id_1' })
      assert.strictEqual(userSessions.length, 1, 'Expected exactly 1 user session')
      assert.strictEqual(userSessions[0].session_id, 'test_session_id_1')
    })

    test('user sessions can be cleaned up after expiration', async function () {
      // Create a user session that expires on 2026-01-01 at 00:08:00 UTC
      let userSession = {
        session_id: 'test_session_id_expire',
        user_id: user1.id,
        csfr_code: 'test_csrf_token_expire',
        expires_at: new Date('2026-01-01T00:08:00Z')
      }
      await dbaccess.createUserSession(dbclient, userSession)

      // Clean up expired sessions
      let cleanedUpCount = await dbaccess.deleteExpiredSessions(dbclient, new Date('2026-01-01T00:09:00Z'))
      assert.strictEqual(cleanedUpCount, 1, 'Expected exactly 1 expired user session to be cleaned up')

    })
  })

})
