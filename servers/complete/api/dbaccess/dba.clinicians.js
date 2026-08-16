/**
 * Import types from the datamodels.
 * @typedef {import("../../../../datamodel/types.js").Clinician} Clinician
 */

/**
 * Gets clinicians by user id, email or team.
 * If no parameter is provided, all clinicians are returned.
 * @param {Client} connection - the database connection
 * @param {Object} queryParams - query parameters, contains p_id, user_id, email, or team_id
 * @returns {Promise<Array<Clinician>>} - a promise that resolves to an array of clinicians
 */
async function getClinicians (connection, queryParams = null) {
    const query = {
        text: 'SELECT clinicians.* FROM clinicians ',
        values: [],
    }

    if (queryParams && queryParams.team_id) {
        query.text = ` SELECT clinicians.*, clinician_team.role FROM clinicians
            JOIN clinician_team ON clinician_team.clinician_id = clinicians.id
            WHERE clinician_team.team_id = $` + (query.values.length + 1)
        query.values = [queryParams.team_id]
    }

    if (queryParams && queryParams.user_id) {
        if (query.values.length > 0) {
            query.text += ' AND clinicians.user_id = $' + (query.values.length + 1)
        } else {
            query.text += ' WHERE clinicians.user_id = $1'
        }
        query.values.push(queryParams.user_id)
    }
    if (queryParams && queryParams.p_id) {
        if (query.values.length > 0) {
            query.text += ' AND clinicians.p_id = $' + (query.values.length + 1)
        } else {
            query.text += ' WHERE clinicians.p_id = $1'
        }
        query.values.push(queryParams.p_id)
    }
    if (queryParams && queryParams.email) {
        query.text += `JOIN "users" ON clinicians.user_id = "users".id WHERE "users".email = $` + (query.values.length + 1)
        query.values = [queryParams.email]
    }

    let res = await connection.query(query)
    return res.rows
}

/**
 * Creates a new clinician in the database.
 * The clinician must have a user_id that exists in the "user" table.
 * @param {Client} connection - the database connection
 * @param {Clinician} clinician - the clinician to create
 * @returns {Promise<Clinician>} - a promise that resolves to the created clinician
 */
async function createClinician (connection, clinician) {
    const query = {
        text:
            'INSERT INTO clinicians (user_id, first_names, second_names, created_at) ' +
            'VALUES ($1, $2, $3, NOW()) RETURNING *',
        values: [clinician.user_id, clinician.first_names, clinician.second_names],
    }
    let res = await connection.query(query)
    return res.rows[0]
}

/**
 * Deletes a clinician from the database.
 * @param {Client} connection - the database connection
 * @param {string} id - user_id of the clinician to be deleted
 * @returns {Promise<boolean>} - a promise that resolves to true if the delete was successful
 */
async function deleteClinician (connection, id = null) {
    const query = {
        text: '',
        values: [id],
    }

    query.text = 'DELETE FROM clinicians WHERE id = $1'
    let res = await connection.query(query)

    return res.rowCount > 0
}

export default {
    getClinicians,
    createClinician,
    deleteClinician,
}
