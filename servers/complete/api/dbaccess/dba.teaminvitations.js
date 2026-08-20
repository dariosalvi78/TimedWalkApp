/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").TeamInvitation} TeamInvitation
 */

/**
 * Creates a new team invitation in the database.
 * @param {Object} connection - the database connection
 * @param {TeamInvitation} invitation - the invitation to create
 * @returns {Promise<TeamInvitation>} - a promise that resolves to the created team invitation
 */
async function createTeamInvitation (connection, invitation) {
  const query = {
    text: 'INSERT INTO team_invitations (user_id, team_id, email, language, role, code, expires_at, failed_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    values: [invitation.user_id, invitation.team_id, invitation.email, invitation.language, invitation.role, invitation.code, invitation.expires_at, invitation.failed_attempts]
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Retrieves team invitations from the database based on the provided query parameters.
 * @param {Object} connection - connection to the database
 * @param {Object} queryParams - the query parameters, can include code, user_id, team_id, or email to filter the results
 * @returns {Promise<Array<TeamInvitation>>} - a promise that resolves to the retrieved team invitations
 */
async function getTeamInvitations (connection, queryParams) {
  const query = {
    text: 'SELECT * FROM team_invitations ',
    values: [],
  }

  if (queryParams && queryParams.code) {
    if (query.values.length > 0) {
      query.text += ' AND code = $' + (query.values.length + 1)
    } else {
      query.text += ' WHERE code = $1'
    }
    query.values.push(queryParams.code)
  }
  if (queryParams && queryParams.user_id) {
    if (query.values.length > 0) {
      query.text += ' AND user_id = $' + (query.values.length + 1)
    } else {
      query.text += ' WHERE user_id = $1'
    }
    query.values.push(queryParams.user_id)
  }
  if (queryParams && queryParams.team_id) {
    if (query.values.length > 0) {
      query.text += ' AND team_id = $' + (query.values.length + 1)
    } else {
      query.text += ' WHERE team_id = $1'
    }
    query.values.push(queryParams.team_id)
  }

  if (queryParams && queryParams.email) {
    if (query.values.length > 0) {
      query.text += ' AND email = $' + (query.values.length + 1)
    } else {
      query.text += ' WHERE email = $1'
    }
    query.values.push(queryParams.email)
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Increments the failed attempts for a team invitation by its ID.
 * @param {Object} connection - connection to the database
 * @param {String} id - the id of the team invitation to increment failed attempts for
 * @returns {Promise<TeamInvitation>} - a promise that resolves to the updated team invitation
 */
async function increaseTeamInvitationFailedAttempts (connection, id) {
  const query = {
    text: 'UPDATE team_invitations SET failed_attempts = failed_attempts + 1 WHERE id = $1 RETURNING *',
    values: [id],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes team invitations from the database based on the provided query parameters.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - selects the invitations to delete, by id or team_id
 */
async function deleteTeamInvitations (connection, queryParams) {
  const query = {
    text: 'DELETE FROM team_invitations ',
    values: [],
  }

  if (queryParams && queryParams.id) {
    query.text += ' WHERE id = $1'
    query.values.push(queryParams.id)
  } else if (queryParams && queryParams.team_id) {
    query.text += ' WHERE team_id = $1'
    query.values.push(queryParams.team_id)
  } else {
    throw new Error('No valid query parameters provided for deleting team invitations')
  }

  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Deletes expired team invitations from the database.
 * @param {Object} connection - database connection
 * @param {Date} now - date before which all invites are deleted
 * @returns {Promise<number>} - a promise that resolves to the number of expired team invitations deleted
 */
async function deleteExpiredTeamInvitations (connection, now) {
  const query = {
    text: 'DELETE FROM team_invitations WHERE expires_at < $1',
    values: [now || new Date()],
  }
  let res = await connection.query(query)
  return res.rowCount
}

export default {
  createTeamInvitation,
  getTeamInvitations,
  deleteTeamInvitations,
  deleteExpiredTeamInvitations,
  increaseTeamInvitationFailedAttempts
}
