/**
 * Tests related to the users table in the database.
 */

import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'


describe('Testing access to users,', () => {
  const testDBName = 'testusers'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  test('a new user can be created and deleted', async () => {
    let user = {
      role: 'patient',
      email: 'dario@mau.se',
    }
    let createdUser = await dbaccess.createUser(dbclient, user)
    assert.strictEqual(createdUser.role, user.role)
    assert.strictEqual(createdUser.email, user.email)
    assert.ok(createdUser.created_at)
    assert.ok(createdUser.last_login_at)
    assert.ok(createdUser.p_id)

    let deleted = await dbaccess.deleteUser(dbclient, createdUser.p_id, null)
  })


  describe('when 2 users are created,', () => {
    let user1, user2
    before(async () => {
      let res = await dbtools.query(
        dbclient,
        `
                INSERT INTO "users" (p_id, role, email, created_at, last_login_at, failed_login_attempts)
                VALUES (gen_random_uuid(), 'clinician', 'sofia@mau.se', NOW(), NOW(), 0)
                RETURNING *`,
      )
      user1 = res.rows[0]

      res = await dbtools.query(
        dbclient,
        `
                    INSERT INTO "users" (p_id, role, email, created_at, last_login_at, failed_login_attempts)
                    VALUES (gen_random_uuid(), 'clinician', 'anthony@mau.se', NOW(), NOW(), 0)
                    RETURNING *`,
      )
      user2 = res.rows[0]
    })

    after(async () => {
      await dbtools.query(dbclient, `DELETE FROM "users" WHERE p_id = $1`, [user1.p_id])
      await dbtools.query(dbclient, `DELETE FROM "users" WHERE p_id = $1`, [user2.p_id])
    })

    test('all users can be retrieved', async function () {
      let users = await dbaccess.getUsers(dbclient, null, null)
      assert.strictEqual(users.length, 2)
    })

    test('anthony@mau.se can be retrieved', async function () {
      let users = await dbaccess.getUsers(dbclient, { email: 'anthony@mau.se' })
      assert.strictEqual(users.length, 1)
      assert.strictEqual(users[0].email, 'anthony@mau.se')
    })

    test('sofia@mau.se can be increased the failed login attempts', async function () {
      let user = await dbaccess.addFailedLoginAttempt(dbclient, 'sofia@mau.se')
      assert.strictEqual(user.email, 'sofia@mau.se')
      assert.strictEqual(user.failed_login_attempts, 1)
    })

    test('inexisting email cannot be increased the failed login attempts', async function () {
      let user = await dbaccess.addFailedLoginAttempt(dbclient, 'nonexistent@mau.se')
      assert.ok(!user)
    })

  })

})
