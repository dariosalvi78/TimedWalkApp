/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").LoginCode} LoginCode
 */

/**
 * Fetches login codes from the database.
 * @param {Object} connection - the database connection
 * @param {Object} queryParams - query parameters, contains email and code for lookup
 * @returns {Promise<Array<LoginCode>>} - a promise that resolves to an array of login codes
 */
async function getLoginCodes (connection, queryParams = null) {
  const query = {
    text: 'SELECT * FROM "login_codes"',
    values: [],
  }

  if (queryParams && queryParams.code) {
    query.text += ' WHERE code = $1'
    query.values.push(queryParams.code)
    if (queryParams.email) {
      query.text += ' AND email = $2'
      query.values.push(queryParams.email)
    }
  }

  let res = await connection.query(query)
  return res.rows
}

/**
 * Creates a login code.
 * @param {Object} connection - the database connection
 * @param {LoginCode} loginCode - the logincode to be added
 */
async function createLoginCode (connection, loginCode) {
  const query = {
    text:
      'INSERT INTO "login_codes" (email, code, expires_at, created_at) ' +
      'VALUES ($1, $2, $3, NOW()) RETURNING *',
    values: [loginCode.email, loginCode.code, loginCode.expires_at],
  }
  let res = await connection.query(query)
  return res.rows[0]
}

/**
 * Deletes a single login code from the database.
 * @param {string} code - the login code to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 * @param {Object} connection - the connection to the database
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteLoginCode (connection, email, code) {
  const query = {
    text: 'DELETE FROM "login_codes" WHERE email = $1 AND code = $2',
    values: [email, code],
  }
  let res = await connection.query(query)
  return res.rowCount > 0
}

/**
 * Deletes expired login codes from the database.
 * @param {Object} connection - connection to the database
 * @param {Date} now - date of now, optional, used for testing
 */
async function deleteExpiredLoginCodes (connection, now) {
  const query = {
    text: 'DELETE FROM "login_codes" WHERE expires_at < $1',
    values: [now || new Date()],
  }
  let res = await connection.query(query)
  return res.rowCount
}

export default { getLoginCodes, createLoginCode, deleteLoginCode, deleteExpiredLoginCodes }
