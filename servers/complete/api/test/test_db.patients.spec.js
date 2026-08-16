import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'

describe('Testing access to patients,', () => {
  const testDBName = 'testpatients'
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
                VALUES ('patient', 'sofia@mau.se', NOW(), NOW())
                RETURNING *`,
      )
      user1 = res.rows[0]

      res = await dbtools.query(
        dbclient,
        `
                    INSERT INTO "users" (role, email, created_at, last_login_at)
                    VALUES ('patient', 'anthony@mau.se', NOW(), NOW())
                    RETURNING *`,
      )
      user2 = res.rows[0]
    })

    after(async () => {
      await dbtools.query(dbclient, `DELETE FROM "users" WHERE id = $1`, [user1.id])
      await dbtools.query(dbclient, `DELETE FROM "users" WHERE id = $1`, [user2.id])
    })

    test('a patient can be created and deleted', async () => {
      let createdPatient = await dbaccess.createPatient(dbclient, {
        user_id: user1.id,
        first_names: 'Sofia',
        second_names: 'Mau',
        date_of_birth: '1990-01-01',
        sex: 'female',
        email: 'sofia@mau.se',
        phone_number: '1234567890',
      })

      assert.strictEqual(createdPatient.user_id, user1.id)
      assert.strictEqual(createdPatient.first_names, 'Sofia')
      assert.strictEqual(createdPatient.second_names, 'Mau')
      assert.ok(createdPatient.date_of_birth instanceof Date)
      assert.strictEqual(createdPatient.sex, 'female')
      assert.strictEqual(createdPatient.email, 'sofia@mau.se')
      assert.strictEqual(createdPatient.phone_number, '1234567890')

      let deleted = await dbaccess.deletePatient(dbclient, createdPatient.id)
      assert.strictEqual(deleted, true)
    })

    describe('when patients are created,', () => {
      let patient1, patient2
      before(async () => {
        patient1 = await dbaccess.createPatient(dbclient, {
          user_id: user1.id,
          first_names: 'Sofia',
          second_names: 'Mau',
          date_of_birth: '1990-01-01',
          sex: 'female',
          email: 'sofia@mau.se',
          phone_number: '1234567890',
        })

        patient2 = await dbaccess.createPatient(dbclient, {
          user_id: user2.id,
          first_names: 'Anthony',
          second_names: 'Mau',
          date_of_birth: '1992-02-02',
          sex: 'male',
          email: 'anthony@mau.se',
          phone_number: '0987654321',
        })
      })

      after(async () => {
        await dbaccess.deletePatient(dbclient, patient1.id)
        await dbaccess.deletePatient(dbclient, patient2.id)
      })

      test('all patients can be retrieved', async () => {
        let patients = await dbaccess.getPatients(dbclient, null)
        assert.strictEqual(patients.length, 2, 'Expected exactly 2 patients')
      })

      test('a patient can be retrieved by p_id', async () => {
        let patients = await dbaccess.getPatients(dbclient, { p_id: patient1.p_id })
        assert.strictEqual(patients.length, 1)
        assert.strictEqual(patients[0].p_id, patient1.p_id)
      })

      describe('when a team is created and patients are associated with it,', () => {
        let team1, team2
        before(async () => {
          let res = await dbtools.query(
            dbclient,
            `
                    INSERT INTO "teams" (name, contact_details)
                    VALUES ('Test Team', 'Test Contact Details')
                    RETURNING *`,
          )
          team1 = res.rows[0]

          res = await dbtools.query(
            dbclient,
            `
                    INSERT INTO "teams" (name, contact_details)
                    VALUES ('Test Team 2', 'Test Contact Details 2')
                    RETURNING *`,
          )
          team2 = res.rows[0]

          await dbtools.query(
            dbclient,
            `
                    INSERT INTO "patient_team" (patient_id, team_id)
                    VALUES ($1, $2)`,
            [patient1.id, team1.id],
          )

          await dbtools.query(
            dbclient,
            `
                    INSERT INTO "patient_team" (patient_id, team_id)
                    VALUES ($1, $2)`,
            [patient2.id, team2.id],
          )
        })

        after(async () => {
          await dbtools.query(dbclient, `DELETE FROM "patient_team" WHERE patient_id = $1 OR patient_id = $2`, [patient1.id, patient2.id])
          await dbtools.query(dbclient, `DELETE FROM "teams" WHERE id = $1`, [team1.id])
          await dbtools.query(dbclient, `DELETE FROM "teams" WHERE id = $1`, [team2.id])
        })

        test('patients can be retrieved by team_id', async () => {
          let patients = await dbaccess.getPatients(dbclient, { team_id: team1.id })
          assert.strictEqual(patients.length, 1)
          assert.strictEqual(patients[0].id, patient1.id)
        })

        test('patients can be retrieved by id AND team_id', async () => {
          let patients = await dbaccess.getPatients(dbclient, { id: patient1.id, team_id: team1.id })
          assert.strictEqual(patients.length, 1)
          assert.strictEqual(patients[0].id, patient1.id)
        })

        test('patients not in the team cannot be retrieved', async () => {
          let patients = await dbaccess.getPatients(dbclient, { id: patient2.id, team_id: team1.id })
          assert.strictEqual(patients.length, 0)
        })
      })
    })
  })
})
