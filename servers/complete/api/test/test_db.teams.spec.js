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

})
