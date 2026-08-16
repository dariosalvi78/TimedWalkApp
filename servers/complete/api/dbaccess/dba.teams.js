/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").Team} Team
 */

/**
 * Fetches teams from the database.
 * @param {!Object} connection - the database connection
 * @param {Object} queryParams - query parameters, contains id, p_id, name or clinician_id for lookup
 * @returns {Promise<Array<Team>>} - a promise that resolves to an array of teams, if a clinician_id is provided, the role of the clinician in the team is also returned
 */
async function getTeams (connection, queryParams) {
    const query = {
        text: '',
        values: [],
    }

    const { id, p_id, name, clinician_id } = queryParams || {}

    // join with clinician_team table if clinician_id is provided and add the role column to the select statement
    if (clinician_id) {
        query.text = 'SELECT teams.*, clinician_team.role FROM teams JOIN clinician_team ON teams.id = clinician_team.team_id WHERE clinician_team.clinician_id = $1'
        query.values.push(clinician_id)
    } else {
        query.text = 'SELECT * FROM teams'
    }

    if (id) {
        if (query.values.length > 0) {
            query.text += ' AND teams.id = $' + (query.values.length + 1)
        } else {
            query.text += ' WHERE teams.id = $1'
        }
        query.values.push(id)
    }
    if (name) {
        if (query.values.length > 0) {
            query.text += ' AND teams.name = $' + (query.values.length + 1)
        } else {
            query.text += ' WHERE teams.name = $1'
        }
        query.values.push(name)
    }
    if (p_id) {
        if (query.values.length > 0) {
            query.text += ' AND teams.p_id = $' + (query.values.length + 1)
        } else {
            query.text += ' WHERE teams.p_id = $1'
        }
        query.values.push(p_id)
    }

    let res = await connection.query(query)
    return res.rows
}

/**
 * Creates a new team in the database.
 * @param {!Object} connection - the database connection
 * @param {!Team} team - the team to create
 * @returns {Promise<Team>} - a promise that resolves to the created team
 */
async function createTeam (connection, team) {
    const query = {
        text: 'INSERT INTO teams (contact_details, institutions, name, created_at) ' + 'VALUES ($1, $2, $3, NOW()) RETURNING *',
        values: [team.contact_details, team.institutions, team.name],
    }
    let res = await connection.query(query)
    return res.rows[0]
}

/**
 * Deletes a team from the database.
 * @param {!Object} connection - the database connection
 * @param {!string} id - the team to delete
 * @returns {Promise<boolean>} - true if the team is deleted, false otherwise
 */
async function deleteTeam (connection, id) {
    let query = {
        text: 'DELETE FROM teams WHERE id = $1 RETURNING *',
        values: [id],
    }
    let res = await connection.query(query)

    return res.rowCount > 0
}

export default {
    getTeams,
    createTeam,
    deleteTeam,
}
