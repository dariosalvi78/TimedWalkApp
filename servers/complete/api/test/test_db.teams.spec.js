import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import * as dbaccess from '../dbaccess/dbaccess.js'

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
  })

})
