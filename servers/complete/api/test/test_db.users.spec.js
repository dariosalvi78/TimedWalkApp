/**
 * Tests related to the users table in the database.
 */

import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import * as dbtools from './dbtesttools.js'
import * as dbaccess from '../dbaccess/dbaccess.js'


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

  test('a new user can be created', async () => {
    let user = {
      role: 'patient',
      email: 'dario@mau.se',
      hashed_password: 'xxxhashedpasswordxx'
    }
    let createdUser = await dbaccess.createUser(dbclient, user)
    assert.strictEqual(createdUser.role, user.role)
    assert.strictEqual(createdUser.email, user.email)
    assert.strictEqual(createdUser.hashed_password, user.hashed_password)
    assert.ok(createdUser.created_at)
    assert.ok(createdUser.last_login_at)
    assert.ok(createdUser.p_id)
  })

})
