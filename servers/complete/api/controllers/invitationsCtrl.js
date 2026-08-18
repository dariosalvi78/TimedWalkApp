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
import { randomInt } from 'node:crypto'

const INVITATION_CODE_LENGTH = process.env.INVITATION_CODE_LENGTH ? parseInt(process.env.INVITATION_CODE_LENGTH) : 6
const INVITATION_EXPIRATION_HOURS = process.env.INVITATION_EXPIRATION_HOURS ? parseInt(process.env.INVITATION_EXPIRATION_HOURS) : 24
const INVITATION_EMAIL_TITLE = 'Timed Walk Team Invitation'

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
    const randomIndex = randomInt(0, chars.length);
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
  if (req.userSession.user_role !== 'admin' && req.userSession.user_role !== 'clinician') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  // request includes the team public id and the email of the clinician to invite
  const { team_p_id, email, role, patient_p_id } = req.body

  if (!team_p_id || !email || !role) {
    res.status(400).json({ error: 'Missing required fields' })
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
    // session_id, user_id, user_role, isWebClient

    // check if the user is an admin or a clinician associated with the team
    if (req.userSession.user_role === 'clinician') {
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
    let invitation = {}
    invitation.email = email
    invitation.clinician_id = null
    invitation.team_id = teamInfo.id
    invitation.role = role
    invitation.code = invitationCode
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
      invitation.patient_id = patient.id
    }

    // save invitation to the database
    const createdInvitation = await dbaccess.createTeamInvitation(dbclient, invitation)

    const emailMessage = [
      `You have been invited to join the Timed Walk team "${teamInfo.name}" as ${role}.`,
      `Invitation code: ${invitationCode}`,
      `This invitation expires at ${invitation.expires_at.toISOString()}.`
    ].join('\n')

    // send the invitation email
    await emailSender.sendEmail(email, INVITATION_EMAIL_TITLE, emailMessage)

    res.status(200).json({ message: 'Invitation sent successfully', invitation: createdInvitation })

  } catch (error) {
    logger.error('Error sending invitation to clinician:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await dbaccess.releaseConnection(dbclient)
  }
}


export const createPatient = async (req, res) => {
  if (!req.userSession) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (req.userSession.user_role !== 'admin' && req.userSession.user_role !== 'clinician') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const {
    email, language, first_names, second_names, date_of_birth, sex, phone_number, force_create
  } = req.body

  if (!email || !language || !first_names || !second_names || !date_of_birth || !sex || !phone_number) {
    res.status(400).json({ error: 'Missing arguments' })
    return
  }

  let dbclient = await dbaccess.getConnection(true)

  try {

    // find user through email
    const existingUsers = await dbaccess.getUsers(dbclient, { email })
    if (existingUsers && existingUsers.length > 0) {
      if (existingUsers[0].role !== 'patient') {
        res.status(409).json({ error: 'User with this email already exists and is not a patient' })
        return
      } else if (existingUsers[0].role == 'patient') {
        // get the patient associated with this user
        let existingPatients = await dbaccess.getPatients(dbclient, { user_id: existingUsers[0].id })
        res.status(409).json({
          error: 'User with this email already exists', patient: {
            p_id: existingPatients[0].p_id,
            first_names: existingPatients[0].first_names,
            second_names: existingPatients[0].second_names,
            date_of_birth: existingPatients[0].date_of_birth,
            sex: existingPatients[0].sex,
            email: email,
            phone_number: existingPatients[0].phone_number
          }
        })
        return
      }
    }

    // find by names and date of birth, also specify the (different) email to avoid matching the same user
    const existingPatients = await dbaccess.getPatients(dbclient, {
      first_names, second_names, date_of_birth, withEmail: true
    })

    if (existingPatients && existingPatients.length > 0 && !force_create) {
      res.status(409).json(
        existingPatients.map((p) => {
          return {
            p_id: p.p_id,
            first_names: p.first_names,
            second_names: p.second_names,
            date_of_birth: p.date_of_birth,
            sex: p.sex,
            email: p.email, // using email the patient is registered with, not the one being used to create a new patient
            phone_number: p.phone_number
          }
        })
      )
      return
    }
    // if force_create is true, we will create a new patient even if there are existing patients with the same names and date of birth

    let newUser = await dbaccess.createUser(dbclient, {
      email,
      failed_login_attempts: 0,
      role: 'patient',
      language: language.toLowerCase()
    })

    let newPatient = await dbaccess.createPatient(dbclient, {
      user_id: newUser.id,
      first_names,
      second_names,
      sex,
      date_of_birth,
      phone_number
    })


    // send the invitation email
    await emailSender.sendEmail(email, 'Account created', 'Your account has been created.')

    // remove the internal id from the response, only return the public id
    delete newPatient.id
    newPatient.email = email

    res.status(201).json({ patient: newPatient })

  } catch (error) {
    logger.error('Error creating new user:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await dbaccess.releaseConnection(dbclient)
  }
}

export const createClinicianWithTeamInvitation = async (req, res) => {
  // check that all fields are present else 400

  // run cleanup of expired codes

  // find code on db, else 404

  // create clinician and associate to team

  // send 201
}

export const acceptTeamInvitation = async (req, res) => {
  // extract code from body, else 400

  // run cleanup of expired codes

  // find code on db, else 404

  // check if patient, there must be a patient p_id, else 400
  //    if patient p_id does not point at anything, send 404

  // check if clinician and no clinician id, send a 400 with a a flag requesting clinician's profile to be created

  // else associate user to team and send a 200
}
