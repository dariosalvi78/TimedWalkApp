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
const INVITATION_MAX_FAILED_ATTEMPTS = process.env.INVITATION_MAX_FAILED_ATTEMPTS ? parseInt(process.env.INVITATION_MAX_FAILED_ATTEMPTS) : 5
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
  const { team_p_id, email, role, patient_p_id, language } = req.body

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
    invitation.user_id = null
    invitation.language = language
    invitation.team_id = teamInfo.id
    invitation.role = role
    invitation.code = invitationCode
    invitation.expires_at = new Date(Date.now() + INVITATION_EXPIRATION_HOURS * 60 * 60 * 1000)
    invitation.failed_attempts = 0

    // check if the user already exists in the system
    if (role === 'clinician_owner' || role === 'clinician_member') {
      const existingUsers = await dbaccess.getUsers(dbclient, { email: email })
      if (existingUsers && existingUsers.length > 0) {
        invitation.user_id = existingUsers[0].id
      } else {
        // if the user does not exist, we can still send the invitation, but the user will have to create an account first
        // the language of the email will need to be set in this case
        if (!language) {
          res.status(400).json({ error: 'Missing language for invitation to non-existing user' })
          return
        }
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
      invitation.user_id = patient.user_id ?? null
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

/**
 * Creates a new patient record
 * @param {Object} req - the http request object
 * @param {Object} res - the http response object
 */
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

/**
 * Creates a new clinician and associates them with a team using an invitation code.
 * No need to be logged in for this.
 * @param {Object} req - the http request object
 * @param {Object} res - the http response object
 */
export const createClinicianWithTeamInvitation = async (req, res) => {
  // check that all fields are present else 400
  const { invitation_code, email, first_names, second_names, language } = req.body
  if (!invitation_code || !email || !first_names || !second_names || !language) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  let dbclient = await dbaccess.getConnection(true)

  try {
    // run cleanup of expired codes
    await dbaccess.deleteExpiredTeamInvitations(dbclient, new Date())
    // find code on db, else 404
    let clinicianInvitation = await dbaccess.getTeamInvitations(dbclient, { code: invitation_code, email: email })
    if (!clinicianInvitation || clinicianInvitation.length === 0) {
      logger.warn(`Team invitation not found for email ${email}`)
      // if there is an invitation for the same email, but with a different code, increase the failed attempts counter and return 404
      let otherInvitations = await dbaccess.getTeamInvitations(dbclient, { email: email })
      if (otherInvitations && otherInvitations.length > 0) {
        for (let inv of otherInvitations) {
          await dbaccess.increaseTeamInvitationFailedAttempts(dbclient, inv.id)
        }
      }
      res.status(404).json({ error: 'Invitation code not found for the provided email' })
      return
    }
    let clinicianInvitationInfo = clinicianInvitation[0]
    // if failed attempts is greater than maximum, return 403
    if (clinicianInvitationInfo.failed_attempts >= INVITATION_MAX_FAILED_ATTEMPTS) {
      logger.warn(`Maximum failed attempts exceeded for email ${email}`)
      // TODO: send email to admin notifying them of the failed attempts

      res.status(403).json({ error: 'Maximum failed attempts exceeded for this invitation' })
      return
    }

    /** @type {User} */
    let newUser = {
      email: email,
      failed_login_attempts: 0,
      role: 'clinician',
      language: language.toLowerCase()
    }

    newUser = await dbaccess.createUser(dbclient, newUser)

    /** @type {Clinician} */
    let newClinician = {
      user_id: newUser.id,
      first_names: first_names,
      second_names: second_names
    }
    newClinician = await dbaccess.createClinician(dbclient, newClinician)

    await dbaccess.addClinicianToTeam(dbclient, clinicianInvitationInfo.team_id, newClinician.id, clinicianInvitationInfo.role)

    // delete the invitation
    await dbaccess.deleteTeamInvitations(dbclient, { id: clinicianInvitationInfo.id })

    // send email for confirmation of account creation and team association
    await emailSender.sendEmail(email, 'Account created and associated with team', `Your account has been created and you have been associated with the team.`)

    res.status(201).json({ message: 'Clinician created and associated with team' })
  } catch (error) {
    logger.error('Error creating new clinician:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await dbaccess.releaseConnection(dbclient)
  }
}

/**
 * Accepts a team invitation code and associates patient or clinician with the team.
 * Needs to be logged in as a patient or clinician.
 * @param {Object} req - the http request object
 * @param {Object} res - the http response object
 */
export const acceptTeamInvitation = async (req, res) => {
  if (req.userSession.user_role !== 'patient' && req.userSession.user_role !== 'clinician') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  // extract code from body, else 400
  const { invitation_code } = req.body
  if (!invitation_code) {
    res.status(400).json({ error: 'Missing invitation code' })
    return
  }

  let dbclient = await dbaccess.getConnection(true)

  try {
    // run cleanup of expired codes
    await dbaccess.deleteExpiredTeamInvitations(dbclient, new Date())
    // find code by code and user id, else 404
    let invitation = await dbaccess.getTeamInvitations(dbclient, { code: invitation_code, user_id: req.userSession.user_id })

    if (!invitation || invitation.length === 0) {
      logger.warn(`Team invitation not found for code ${invitation_code}`)
      res.status(404).json({ error: 'Invitation code not found' })
      return
    }
    let invitationInfo = invitation[0]

    // if failed attempts is greater than maximum, return 403
    if (invitationInfo.failed_attempts >= INVITATION_MAX_FAILED_ATTEMPTS) {
      logger.warn(`Maximum failed attempts exceeded for invitation code ${invitation_code}`)
      // TODO: send email to admin notifying them of the failed attempts
      res.status(403).json({ error: 'Maximum failed attempts exceeded for this invitation' })
      return
    }

    // if the invitation has expired, return 403
    if (new Date(invitationInfo.expires_at) < new Date()) {
      logger.warn(`Invitation code ${invitation_code} has expired`)
      await dbaccess.increaseTeamInvitationFailedAttempts(dbclient, invitationInfo.id)
      res.status(403).json({ error: 'Invitation code has expired' })
      return
    }

    // confirm that the invitation is for the correct role (patient or clinician)
    if (req.userSession.user_role === 'patient' && invitationInfo.role !== 'patient') {
      res.status(403).json({ error: 'Invitation code is not for a patient' })
      return
    }
    if (req.userSession.user_role === 'clinician' && (invitationInfo.role !== 'clinician_member' && invitationInfo.role !== 'clinician_owner')) {
      // increase failed attempts for this invitation
      await dbaccess.increaseTeamInvitationFailedAttempts(dbclient, invitationInfo.id)
      res.status(403).json({ error: 'Invitation code is not for a clinician' })
      return
    }

    // all is OK, associate the user with the team
    if (req.userSession.user_role === 'patient') {
      // get the patient record for this user
      let patients = await dbaccess.getPatients(dbclient, { user_id: req.userSession.user_id })
      // associate the patient with the team
      await dbaccess.addPatientToTeam(dbclient, invitationInfo.team_id, patients[0].id)
    } else if (req.userSession.user_role === 'clinician') {
      // get the clinician record for this user
      let clinicians = await dbaccess.getClinicians(dbclient, { user_id: req.userSession.user_id })
      // associate the clinician with the team
      await dbaccess.addClinicianToTeam(dbclient, invitationInfo.team_id, clinicians[0].id, invitationInfo.role)
    }

    // delete the invitation
    await dbaccess.deleteTeamInvitations(dbclient, { id: invitationInfo.id })

    // send email for confirmation of team association
    await emailSender.sendEmail(req.userSession.user_email, 'Associated with team', `You have been associated with the team.`)

    res.status(200).json({ message: 'Invitation accepted and user associated with team' })

  } catch (error) {
    logger.error('Error creating new clinician:', error)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await dbaccess.releaseConnection(dbclient)
  }
}
