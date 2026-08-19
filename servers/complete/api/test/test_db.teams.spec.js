import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'

describe('Testing access to teams,', () => {
  const testDBName = 'testteams'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  test('a team can be created and deleted', async function () {
    let team = {
      name: 'Team A',
      contact_details: 'This is Team A',
      institutions: ['Institution A'],
    }
    let createdTeam = await dbaccess.createTeam(dbclient, team)
    let teams = await dbaccess.getTeams(dbclient)
    assert.strictEqual(teams.length, 1, 'Expected exactly 1 team')

    assert.strictEqual(createdTeam.name, team.name)
    assert.strictEqual(createdTeam.contact_details, team.contact_details)
    assert.deepStrictEqual(createdTeam.institutions, team.institutions)

    let deleted = await dbaccess.deleteTeam(dbclient, createdTeam.id)
    assert.strictEqual(deleted, true)
  })

  describe('when teams are created,', () => {
    let team1, team2
    before(async () => {
      let res = await dbtools.query(
        dbclient,
        `
                  INSERT INTO "teams" (name, contact_details, institutions)
                  VALUES ('Team A', 'Contact details for Team A', '{"Institution A"}')
                  RETURNING *`,
      )
      team1 = res.rows[0]

      res = await dbtools.query(
        dbclient,
        `
                      INSERT INTO "teams" (name, contact_details, institutions)
                      VALUES ('Team B', 'Contact details for Team B', '{"Institution B"}')
                      RETURNING *`,
      )
      team2 = res.rows[0]
    })

    after(async () => {
      await dbtools.query(dbclient, `DELETE FROM "teams" WHERE id IN (${team1.id}, ${team2.id})`)
    })

    test('all teams can be retrieved', async function () {
      let teams = await dbaccess.getTeams(dbclient)
      assert.strictEqual(teams.length, 2, 'Expected exactly 2 teams')
    })

    test('a team can be retrieved by name', async function () {
      let teams = await dbaccess.getTeams(dbclient, { name: 'Team A' })
      assert.strictEqual(teams.length, 1)
      assert.strictEqual(teams[0].name, 'Team A')
    })

    test('a team can be retrieved by id', async function () {
      let teams = await dbaccess.getTeams(dbclient, { id: team2.id })
      assert.strictEqual(teams.length, 1)
      assert.strictEqual(teams[0].name, 'Team B')
    })

    describe('when a clinician is associated with a team,', () => {
      let user1, user2, user3
      let clinician1, clinician2, clinician3
      before(async () => {

        // store users for clinicians
        let res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "users" (email, role)
                  VALUES ('clinician1@example.com', 'clinician')
                  RETURNING *`,
        )
        user1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                      INSERT INTO "users" (email, role)
                      VALUES ('clinician2@example.com', 'clinician')
                      RETURNING *`,
        )
        user2 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                      INSERT INTO "users" (email, role)
                      VALUES ('clinician3@example.com', 'clinician')
                      RETURNING *`,
        )
        user3 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "clinicians" (user_id, first_names, second_names)
                  VALUES (${user1.id}, 'Clinician', 'One')
                  RETURNING *`,
        )
        clinician1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                      INSERT INTO "clinicians" (user_id, first_names, second_names)
                      VALUES (${user2.id}, 'Clinician', 'Two')
                      RETURNING *`,
        )
        clinician2 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                      INSERT INTO "clinicians" (user_id, first_names, second_names)
                      VALUES (${user3.id}, 'Clinician', 'Three')
                      RETURNING *`,
        )
        clinician3 = res.rows[0]

        await dbtools.query(
          dbclient,
          `
                  INSERT INTO "clinician_team" (clinician_id, team_id, role)
                  VALUES (${clinician1.id}, ${team1.id}, 'clinician_owner')`,
        )

        await dbtools.query(
          dbclient,
          `
                      INSERT INTO "clinician_team" (clinician_id, team_id, role)
                      VALUES (${clinician2.id}, ${team2.id}, 'clinician_member')`,
        )
      })

      after(async () => {
        await dbtools.query(dbclient, `DELETE FROM "clinician_team" WHERE clinician_id IN (${clinician1.id}, ${clinician2.id})`)
        await dbtools.query(dbclient, `DELETE FROM "clinicians" WHERE id IN (${clinician1.id}, ${clinician2.id}, ${clinician3.id})`)
        await dbtools.query(dbclient, `DELETE FROM "users" WHERE id IN (${user1.id}, ${user2.id}, ${user3.id})`)
      })

      test('a team can be retrieved by clinician id and the role is specified', async function () {
        let teams = await dbaccess.getTeams(dbclient, { clinician_id: clinician1.id })
        assert.strictEqual(teams.length, 1)
        assert.strictEqual(teams[0].id, team1.id)
        assert.strictEqual(teams[0].role, 'clinician_owner', 'Expected role to be clinician_owner')

        teams = await dbaccess.getTeams(dbclient, { clinician_id: clinician2.id })
        assert.strictEqual(teams.length, 1)
        assert.strictEqual(teams[0].id, team2.id)
        assert.strictEqual(teams[0].role, 'clinician_member', 'Expected role to be clinician_member')
      })

      test('a clinician with no team associations returns an empty array', async function () {
        let teams = await dbaccess.getTeams(dbclient, { clinician_id: clinician3.id })
        assert.strictEqual(teams.length, 0)
      })

      test('a clinician can be added to a team', async function () {
        await dbaccess.addClinicianToTeam(dbclient, team1.id, clinician3.id, 'clinician_member')
        let teams = await dbaccess.getTeams(dbclient, { clinician_id: clinician3.id })
        assert.strictEqual(teams.length, 1)
        assert.strictEqual(teams[0].id, team1.id)
        assert.strictEqual(teams[0].role, 'clinician_member', 'Expected role to be clinician_member')
      })
    })

  })
})
