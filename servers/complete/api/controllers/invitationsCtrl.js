/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").User} User
 * @typedef {import("../../../../datamodel/types.js").LoginCode} LoginCode
 * @typedef {import("../../../../datamodel/types.js").Clinician} Clinician
 * @typedef {import("../../../../datamodel/types.js").Team} Team
 * @typedef {import("../../../../datamodel/types.js").ClinicianTeam} ClinicianTeam
 * @typedef {import("../../../../datamodel/types.js").TeamInvitation} TeamInvitation
 * @typedef {import("../../../../datamodel/types.js").Patient} Patient
 */

import logger from '../services/logger.js'
import dbaccess from '../dbaccess/dbaccess.js'
import { emailSender } from '../services/emailSender.js'
import { randomBytes, randomUUID } from 'node:crypto'

const INVITATION_CODE_LENGTH = process.env.INVITATION_CODE_LENGTH ? parseInt(process.env.INVITATION_CODE_LENGTH) : 6
const INVITATION_EXPIRATION_HOURS = process.env.INVITATION_EXPIRATION_HOURS ? parseInt(process.env.INVITATION_EXPIRATION_HOURS) : 24

/**
 * Generates a random alphanumeric code.
 * @param {number} length - Length of the string (default: 6)
 * @returns {string}
 */
function generateInvitationCode (length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    // crypto.randomInt is cryptographically secure and avoids bias
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }

  return result;
}

/**
 * Sends an invitation to a clinician or patient to join a team.
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @returns
 */
export const sendTeamInvitation = async (req, res) => {
  if (!req.userSession) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  // only admins and clinicians can send invitations
  if (req.userSession.user.role !== 'admin' && req.userSession.user.role !== 'clinician') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  // request includes the team public id and the email of the clinician to invite
  const { team_p_id, email, role, invitation_message, patient_p_id } = req.body

  if (!team_p_id || !email || !role || !invitation_message) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const { title, message } = invitation_message
  if (!title || !message) {
    res.status(400).json({ error: 'Invalid invitation message' })
    return
  }

  // role can be 'clinician_member', 'clinician_owner', 'patient'
  if (role !== 'clinician_member' && role !== 'clinician_owner' && role !== 'patient') {
    res.status(400).json({ error: 'Invalid role' })
    return
  }

  let dbclient = await dbaccess.getConnection()

  try {

    // verify that the team exists and that the requesting user has permission to invite clinicians to it
    const team = await dbaccess.getTeams(dbclient, { p_id: team_p_id })
    if (!team || team.length === 0) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    const teamInfo = team[0]

    // user session contains:
    // session_id, user_id, userType, isWebClient

    // check if the user is an admin or a clinician associated with the team
    if (req.userSession.userType === 'clinician') {
      const cliniciansInTeam = await dbaccess.getClinicians(dbclient, { team_id: teamInfo.id, user_id: req.userSession.user_id })
      if (!cliniciansInTeam || cliniciansInTeam.length === 0) {
        res.status(403).json({ error: 'Clinician does not belong to team' })
        return
      }

      // check if the clinician has the right role to invite other clincians
      if (role === 'clinician_owner' || role === 'clinician_member') {
        let roleOfInviter = cliniciansInTeam[0].role
        if (roleOfInviter !== 'clinician_owner') {
          res.status(403).json({ error: 'Clinician does not have permission to invite other clinicians' })
          return
        }
      }
    }

    // generate 6 random characters for the invitation code
    const invitationCode = generateInvitationCode(INVITATION_CODE_LENGTH)

    // create the invitation in the database
    /** @type {TeamInvitation} */
    let invitation
    invitation.clinician_id = null
    invitation.team_id = teamInfo.id
    invitation.role = role
    invitation.code = invitationCode
    invitation.invitation_message = invitation_message
    invitation.expires_at = new Date(Date.now() + INVITATION_EXPIRATION_HOURS * 60 * 60 * 1000)
    invitation.failed_attempts = 0

    // check if the clinician already exists in the system
    if (role === 'clinician_owner' || role === 'clinician_member') {
      const existingClinicians = await dbaccess.getClinicians(dbclient, { email: email })
      if (existingClinicians && existingClinicians.length > 0) {
        invitation.clinician_id = existingClinicians[0].id
      }
    }

    // if it's a patient invitation, the patient must exist in the system and be associated with the team
    if (role === 'patient') {
      if (!patient_p_id) {
        res.status(400).json({ error: 'Missing patient public id for patient invitation' })
        return
      }
      const existingPatients = await dbaccess.getPatients(dbclient, { p_id: patient_p_id })
      if (!existingPatients || existingPatients.length === 0) {
        res.status(404).json({ error: 'Patient not found' })
        return
      }
      const patient = existingPatients[0]
      // check if the patient is associated with the team
      const patientsInTeam = await dbaccess.getPatients(dbclient, { team_id: teamInfo.id, id: patient.id })
      if (!patientsInTeam || patientsInTeam.length === 0) {
        res.status(403).json({ error: 'Patient does not belong to team' })
        return
      }
      invitation.patient_id = patient.id
    }

    // save invitation to the database
    const createdInvitation = await dbaccess.createTeamInvitation(dbclient, invitation)

    // send the invitation email
    await emailSender.sendEmail(email, title, message)

    res.status(200).json({ message: 'Invitation sent successfully', invitation: createdInvitation })

  } catch (error) {
    logger.error('Error sending invitation to clinician:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await dbaccess.releaseConnection(dbclient)
  }
}
