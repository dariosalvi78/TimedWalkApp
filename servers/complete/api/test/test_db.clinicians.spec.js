import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import * as dbaccess from '../dbaccess/dbaccess.js'

describe('Testing access to clinicians,', () => {
  const testDBName = 'testclinicians'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })


  describe('when users are created,', () => {
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

    test('all users can be rerieved', async function () {
      let users = await dbaccess.getUsers(dbclient, null, null)
      assert.strictEqual(users.length, 2, 'Expected exactly 2 users')
    })

    test('anthony@mau.se can be rerieved', async function () {
      let users = await dbaccess.getUsers(dbclient, { email: 'anthony@mau.se' })
      assert.strictEqual(users.length, 1)
      assert.strictEqual(users[0].email, 'anthony@mau.se')
    })

    test('a new clinician can be created and deleted', async () => {
      let createdUser = await dbaccess.createUser(dbclient, {
        role: 'clinician',
        email: 'sebastian@mau.se'
      })

      let newClinician = {
        user_id: createdUser.id,
        first_names: 'Sebastian',
        second_names: 'Aguilar',
      }
      let createClinician = await dbaccess.createClinician(dbclient, newClinician)
      assert.strictEqual(createClinician.first_names, newClinician.first_names)
      assert.strictEqual(createClinician.second_names, newClinician.second_names)
      assert.strictEqual(createClinician.user_id, createdUser.id)

      let deleted = await dbaccess.deleteClinician(dbclient, createClinician.id)
      // let deleted = await dbaccess.cleanUpClinician(dbclient, createClinician.id)

      assert.strictEqual(deleted, true)
    })


    describe('when also clinicians are created,', () => {
      let clinician1, clinician2
      before(async () => {
        let res = await dbtools.query(
          dbclient,
          `
                    INSERT INTO clinicians (user_id, first_names, second_names)
                    VALUES ('${user1.id}', 'Sofia', 'Loren')
                    RETURNING *`,
        )
        clinician1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                    INSERT INTO clinicians (user_id, first_names, second_names)
                    VALUES ('${user2.id}', 'Anthony', 'Queen')
                    RETURNING *`,
        )
        clinician2 = res.rows[0]
      })

      test('all clinicians can be rerieved', async function () {
        let clinicians = await dbaccess.getClinicians(dbclient, null, null)
        assert.ok(clinicians.length >= 2)
        let names = clinicians.map((c) => c.first_names)
        assert.ok(names.includes('Sofia'))
        assert.ok(names.includes('Anthony'))
      })

      test('a clinician can be retrieved by id', async function () {
        let clinicians = await dbaccess.getClinicians(dbclient, { user_id: clinician1.user_id })
        assert.strictEqual(clinicians.length, 1)
        assert.strictEqual(clinicians[0].first_names, 'Sofia')
      })

      test('a clinician can be retrieved by email', async function () {
        let clinicians = await dbaccess.getClinicians(dbclient, { email: 'anthony@mau.se' })
        assert.strictEqual(clinicians.length, 1)
        assert.strictEqual(clinicians[0].first_names, 'Anthony')
      })
    })
  })
})
