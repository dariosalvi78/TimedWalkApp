/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").UserSession} UserSession
 */

/**
 * Retrieves user sessions from the database.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - query parameters, contains session_id and (optional) csrf_code and max_expiry_time as date
 * @returns {Promise<Array<UserSession>>} - a promise that resolves to an array of user sessions
 */
async function getUserSessions (connection, queryParams = null) {
    const query = {
        text: 'SELECT * FROM "user_sessions"',
        values: [],
    }

    if (queryParams && queryParams.session_id) {
        query.text += ' WHERE session_id = $1'
        query.values.push(queryParams.session_id)

        if (queryParams.csrf_code) {
            query.text += ' AND csrf_code = $2'
            query.values.push(queryParams.csrf_code)
        }
    }

    if (queryParams && queryParams.max_expiry_time) {
        query.text += query.text.includes('WHERE') ? ' AND expires_at > $3' : ' WHERE expires_at > $3'
        query.values.push(queryParams.max_expiry_time)
    }

    let res = await connection.query(query)
    return res.rows
}

/**
 * Retrieves user sessions with associated user information from the database.
 * @param {Object} connection - database connection
 * @param {Object} queryParams - query parameters, contains session_id and (optional) csrf_code and max_expiry_time as date
 * @returns {Promise<Array<UserSessionWithUser>>} - a promise that resolves to an array of user sessions with associated user information
 */
async function getUserSessionsWithUser (connection, queryParams = null) {
    const query = {
        text: 'SELECT * FROM "user_sessions" JOIN "users" ON "user_sessions".user_id = "users".id',
        values: [],
    }

    if (queryParams && queryParams.session_id) {
        query.text += ' WHERE session_id = $1'
        query.values.push(queryParams.session_id)

        if (queryParams.csrf_code) {
            query.text += ' AND csrf_code = $2'
            query.values.push(queryParams.csrf_code)
        }
    }

    if (queryParams && queryParams.max_expiry_time) {
        query.text += query.text.includes('WHERE') ? ' AND expires_at > $3' : ' WHERE expires_at > $3'
        query.values.push(queryParams.max_expiry_time)
    }

    let res = await connection.query(query)
    return res.rows
}

/**
 * Creates a new user session in the database.
 * @param {Object} connection - database connection
 * @param {UserSession} session - the user session to create
 * @returns {Promise<UserSession>} - a promise that resolves to the created user session
 */
async function createUserSession (connection, session) {
    const query = {
        text:
            'INSERT INTO "user_sessions" (session_id, user_id, csfr_code, expires_at, created_at) ' +
            'VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        values: [session.session_id, session.user_id, session.csfr_code, session.expires_at],
    }
    let res = await connection.query(query)
    return res.rows[0]
}

/**
 * Updates a single user session in the database.
 * @param {Object} connection - database connection
 * @param {string} session_id - unique session id
 * @param {Object} updateParams - key value
 * @returns {Promise<UserSession>} - a promise that resolves to the updated user session
 */
async function updateUserSession (connection, session_id, updateParams) {
    const allowedParams = ['session_id', 'user_id', 'csfr_code', 'expires_at', 'created_at']

    const query = {
        text:
            'UPDATE "user_sessions" SET ',
        values: []
    }

    for (let param of Object.keys(updateParams)) {
        if (allowedParams.includes(param)) {
            query.text += `${param} = $${query.values.length + 1}, `
            query.values.push(updateParams[param])
        }
    }

    if (query.values.length === 0) {
        return null
    }

    query.text = query.text.slice(0, -2) // Remove trailing comma and space
    query.text += ' WHERE session_id = $' + (query.values.length + 1)
    query.values.push(session_id)
    query.text += ' RETURNING *'
    let res = await connection.query(query)
    return res.rows[0]
}

/**
 * Deletes a user session from the database.
 * @param {Object} connection - database connection
 * @param {string} session_id - unique session id
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteUserSession (connection, session_id) {
    const query = {
        text: 'DELETE FROM "user_sessions" WHERE session_id = $1',
        values: [session_id],
    }
    let res = await connection.query(query)
    return res.rowCount > 0
}

/**
 * Deletes expired user sessions from the database.
 * @param {Object} connection - db connection
 * @param {Date} now - the current date and time, used to determine which sessions are expired
 * @returns {Promise<number>} - a promise that resolves to the number of expired sessions deleted
 */
async function deleteExpiredUserSessions (connection, now) {
    if (!now) now = new Date()
    const query = {
        text: 'DELETE FROM "user_sessions" WHERE expires_at < $1',
        values: [now],
    }
    let res = await connection.query(query)
    return res.rowCount
}

export default {
    getUserSessions,
    createUserSession,
    updateUserSession,
    deleteUserSession,
    getUserSessionsWithUser,
    deleteExpiredUserSessions,
}
