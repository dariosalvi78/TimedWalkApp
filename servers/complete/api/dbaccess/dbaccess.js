/**
 * This module provides a data access layer for the Timed Walk backend.
 */


/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").User} User
 * @typedef {import("../../../../datamodel/types.js").LoginCode} LoginCode
 * @typedef {import("../../../../datamodel/types.js").Clinician} Clinician
 * @typedef {import("../../../../datamodel/types.js").Team} Team
 * @typedef {import("../../../../datamodel/types.js").ClinicianTeam} ClinicianTeam
 * @typedef {import("../../../../datamodel/types.js").TeamInvitation} TeamInvitation
 * @typedef {import("../../../../datamodel/types.js").Patient} Patient
 * @typedef {import("../../../../datamodel/types.js").UserSession} UserSession
 * @typedef {import("../../../../datamodel/types.js").UserDeviceId} UserDeviceId
 */

import logger from '../services/logger.js'
import dblogincodes from './dba.logincodes.js'
import dbausers from './dba.users.js'
import dbasecurityquestions from './dba.securityquestions.js'
import dbausersessions from './dba.usersessions.js'
import dbadeviceids from './dba.deviceids.js'
import dbaclinicians from './dba.clinicians.js'
import dbapatients from './dba.patients.js'
import dbateams from './dba.teams.js'
import dbateaminvitations from './dba.teaminvitations.js'

import { Pool } from 'pg'
const pool = new Pool()

// connection settings are read from standard environment variables
// see https://node-postgres.com/features/connecting

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err) => {
  logger.error(err, 'Unexpected error on idle client')
  process.exit(-1)
})



/**
 * Gets a connection from the pool.
 * The connection is wrapped and will log an error message if it is not released after 5 seconds.
 * @param {boolean} withTransaction - if true, a transaction will be started on the connection
 * @returns {Promise<Object>} - a promise that resolves to a client
 */
async function getConnection (withTransaction = false) {
  const client = await pool.connect()
  if (withTransaction) {
    logger.debug('Beginning transaction')
    await client.query('BEGIN')
  }

  let c = {
    hasTransaction: withTransaction,
    client: client,
    lastQuery: null,
    timeout: null,
    query (text, params) {
      logger.debug('Querying', text)
      this.lastQuery = text
      return this.client.query(text, params)
    },
    release () {
      clearTimeout(this.timeout)
      this.client.release()
    },
  }
  c.timeout = setTimeout(() => {
    console.error('CLIENT BLOCKING!', JSON.stringify(c.lastQuery))
    logger.error(c.lastQuery, 'A client has been checked out for more than 5 seconds!')
    this.release()
  }, 5000)

  return c
}

/**
 * Releases a connection back to the pool.
 * If a transaction was started, it will be committed first.
 * @param {Object} client - the client to release
 * @param {boolean} withTransaction - if true, a transaction will be committed before releasing the client
 */
async function releaseConnection (client) {
  if (!client) {
    logger.error('Tried to release a null client')
    return
  }
  if (client.hasTransaction) {
    logger.debug('Ending transaction')
    await client.query('COMMIT')
  }
  client.release()
}

/**
 * Aborts a transaction on the client.
 * @param {Object} client - the client to abort the transaction on
 */
async function abortConnection (client) {
  if (!client) {
    logger.error('Tried to abort a null client')
    return
  }
  if (client.hasTransaction) {
    logger.debug('Rolling back transaction')
    await client.query('ROLLBACK')
  }
  client.release()
}




export default {
  getConnection,
  releaseConnection,
  abortConnection,

  // users
  getUsers: dbausers.getUsers,
  createUser: dbausers.createUser,
  addFailedLoginAttempt: dbausers.addFailedLoginAttempt,
  deleteUser: dbausers.deleteUser,

  // clinicians
  getClinicians: dbaclinicians.getClinicians,
  createClinician: dbaclinicians.createClinician,
  deleteClinician: dbaclinicians.deleteClinician,

  // patients
  getPatients: dbapatients.getPatients,
  createPatient: dbapatients.createPatient,
  deletePatient: dbapatients.deletePatient,

  // login codes
  createLoginCode: dblogincodes.createLoginCode,
  getLoginCodes: dblogincodes.getLoginCodes,
  deleteLoginCode: dblogincodes.deleteLoginCode,

  // security questions
  createUserSecurityQuestion: dbasecurityquestions.createUserSecurityQuestion,
  getUserSecurityQuestions: dbasecurityquestions.getUserSecurityQuestions,
  deleteUserSecurityQuestion: dbasecurityquestions.deleteUserSecurityQuestion,
  updateUserSecurityQuestion: dbasecurityquestions.updateUserSecurityQuestion,

  // user sessions
  getUserSessions: dbausersessions.getUserSessions,
  createUserSession: dbausersessions.createUserSession,
  updateUserSession: dbausersessions.updateUserSession,
  deleteUserSession: dbausersessions.deleteUserSession,
  getUserSessionsWithUser: dbausersessions.getUserSessionsWithUser,
  deleteExpiredUserSessions: dbausersessions.deleteExpiredUserSessions,

  // device ids
  getDeviceIds: dbadeviceids.getDeviceIds,
  createDeviceId: dbadeviceids.createDeviceId,
  deleteDeviceId: dbadeviceids.deleteDeviceId,
  updateDeviceId: dbadeviceids.updateDeviceId,
  deleteDeviceIdsOlderThan: dbadeviceids.deleteDeviceIdsOlderThan,

  // teams
  getTeams: dbateams.getTeams,
  createTeam: dbateams.createTeam,
  deleteTeam: dbateams.deleteTeam,
  addClinicianToTeam: dbateams.addClinicianToTeam,

  // team invitations
  createTeamInvitation: dbateaminvitations.createTeamInvitation,
  getTeamInvitations: dbateaminvitations.getTeamInvitations,
  deleteTeamInvitations: dbateaminvitations.deleteTeamInvitations,
  deleteExpiredTeamInvitations: dbateaminvitations.deleteExpiredTeamInvitations,
  increaseTeamInvitationFailedAttempts: dbateaminvitations.increaseTeamInvitationFailedAttempts
}

