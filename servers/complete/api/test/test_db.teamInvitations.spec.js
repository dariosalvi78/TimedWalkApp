import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import * as dbtools from './dbtesttools.js'
import dbaccess from '../dbaccess/dbaccess.js'

describe('Testing access to team invitations,', () => {
  const testDBName = 'testteaminvitations'
  let dbclient

  before(async () => {
    dbclient = await dbtools.createTestDBAndReturnClient(testDBName)
  })

  after(async () => {
    await dbtools.closePostgresClient(dbclient)
    await dbtools.dropTestDB(testDBName)
  })

  describe('when a team exists,', () => {
    let team
    before(async () => {
      let res = await dbtools.query(
        dbclient,
        `
                  INSERT INTO "teams" (name, contact_details, institutions)
                  VALUES ('Team A', 'Contact details for Team A', '{"Institution A"}')
                  RETURNING *`,
      )
      team = res.rows[0]
    })

    test('a team invitation can be created and deleted', async function () {

      let invitation = {
        team_id: team.id,
        clinician_id: null,
        patient_id: null,
        role: 'patient',
        code: 'ABC123',
        email: 'dario@mau.se',
        invitation_messages: { message: 'You are invited!' },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        failed_attempts: 0
      }
      let createdInvitation = await dbaccess.createTeamInvitation(dbclient, invitation)
      let invites = await dbaccess.getTeamInvitations(dbclient, { team_id: team.id })
      assert.strictEqual(invites.length, 1, 'Expected exactly 1 team invitation')

      assert.strictEqual(createdInvitation.team_id, invitation.team_id)
      assert.strictEqual(createdInvitation.clinician_id, invitation.clinician_id)
      assert.strictEqual(createdInvitation.patient_id, invitation.patient_id)
      assert.strictEqual(createdInvitation.role, invitation.role)
      assert.strictEqual(createdInvitation.code, invitation.code)
      assert.strictEqual(createdInvitation.email, invitation.email)
      assert.deepStrictEqual(createdInvitation.invitation_messages, invitation.invitation_messages)
      assert.strictEqual(createdInvitation.failed_attempts, invitation.failed_attempts)

      let deleted = await dbaccess.deleteTeamInvitations(dbclient, { id: createdInvitation.id })
      assert.strictEqual(deleted, true)
    })

    describe('when 2 invitations exist for the team,', () => {
      let invitation1, invitation2
      before(async () => {
        let res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "team_invitations" (team_id, clinician_id, patient_id, role, code, email, invitation_messages, expires_at, failed_attempts)
                  VALUES (${team.id}, null, null, 'patient', 'INVITE1', 'patient1@test.com', '{"message": "You are invited!"}', NOW() + INTERVAL '7 days', 0)
                  RETURNING *`,
        )
        invitation1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "team_invitations" (team_id, clinician_id, patient_id, role, code, email, invitation_messages, expires_at, failed_attempts)
                  VALUES (${team.id}, null, null, 'patient', 'INVITE2', 'patient2@test.com', '{"message": "You are invited!"}', NOW() + INTERVAL '7 days', 0)
                  RETURNING *`,
        )
        invitation2 = res.rows[0]
      })

      after(async () => {
        await dbtools.query(dbclient, `DELETE FROM "team_invitations" WHERE id IN (${invitation1.id}, ${invitation2.id})`)
      })

      test('all invitations for the team can be retrieved', async function () {
        let invites = await dbaccess.getTeamInvitations(dbclient, { team_id: team.id })
        assert.strictEqual(invites.length, 2)
      })

      test('invitation INVITE1 can be retrieved', async function () {
        let invites = await dbaccess.getTeamInvitations(dbclient, { code: 'INVITE1' })
        assert.strictEqual(invites.length, 1)
        assert.strictEqual(invites[0].code, 'INVITE1')
      })
    })

    describe('when 2 invitations exist for the team, one expired one not,', () => {
      let invitation1, invitation2
      let now = new Date('2024-10-10T12:00:00Z')
      before(async () => {
        let res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "team_invitations" (team_id, clinician_id, patient_id, role, code, email, invitation_messages, expires_at, failed_attempts)
                  VALUES (${team.id}, null, null, 'patient', 'INVITE1', 'patient1@test.com', '{"message": "You are invited!"}', '2024-10-01 14:35:00+00', 0)
                  RETURNING *`,
        )
        invitation1 = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "team_invitations" (team_id, clinician_id, patient_id, role, code, email, invitation_messages, expires_at, failed_attempts)
                  VALUES (${team.id}, null, null, 'patient', 'INVITE2', 'patient2@test.com', '{"message": "You are invited!"}', '2024-10-17 14:35:00+00', 0)
                  RETURNING *`,
        )
        invitation2 = res.rows[0]
      })

      after(async () => {
        await dbtools.query(dbclient, `DELETE FROM "team_invitations" WHERE id IN (${invitation1.id}, ${invitation2.id})`)
      })

      test('expired invitations can be deleted', async function () {
        let deletedCount = await dbaccess.deleteExpiredTeamInvitations(dbclient, now)
        assert.strictEqual(deletedCount, 1)

        let invites = await dbaccess.getTeamInvitations(dbclient, { team_id: team.id })
        assert.strictEqual(invites.length, 1)
        assert.strictEqual(invites[0].code, 'INVITE2')
      })

    })

    describe('when a clinician exists,', () => {
      let clinician
      before(async () => {

        let res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "users" (role, email, created_at, last_login_at)
                  VALUES ('clinician', 'baba@test.com', NOW(), NOW())
                  RETURNING *`,
        )
        let user = res.rows[0]

        res = await dbtools.query(
          dbclient,
          `
                  INSERT INTO "clinicians" (user_id, first_names, second_names)
                  VALUES (${user.id}, 'Baba', 'Deepak')
                  RETURNING *`,
        )
        clinician = res.rows[0]
      })

      test('a team invitation can be created for a clinician and deleted', async function () {

        let invitation = {
          team_id: team.id,
          clinician_id: clinician.id,
          patient_id: null,
          role: 'clinician_member',
          code: 'XYZ789',
          email: 'baba@test.com',
          invitation_messages: { message: 'You are invited as a clinician!' },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          failed_attempts: 0
        }
        let createdInvitation = await dbaccess.createTeamInvitation(dbclient, invitation)
        let invites = await dbaccess.getTeamInvitations(dbclient, { team_id: team.id })
        assert.strictEqual(invites.length, 1, 'Expected exactly 1 team invitation')

        assert.strictEqual(createdInvitation.team_id, invitation.team_id)
        assert.strictEqual(createdInvitation.clinician_id, invitation.clinician_id)
        assert.strictEqual(createdInvitation.patient_id, invitation.patient_id)
        assert.strictEqual(createdInvitation.role, invitation.role)
        assert.strictEqual(createdInvitation.code, invitation.code)
        assert.strictEqual(createdInvitation.email, invitation.email)
        assert.deepStrictEqual(createdInvitation.invitation_messages, invitation.invitation_messages)
        assert.strictEqual(createdInvitation.failed_attempts, invitation.failed_attempts)

        let deleted = await dbaccess.deleteTeamInvitations(dbclient, { id: createdInvitation.id })
        assert.strictEqual(deleted, true)
      })
    })
  })



})
