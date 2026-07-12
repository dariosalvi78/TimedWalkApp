/**
 * JSDoc type definitions for the shared TimedWalk database schema.
 *
 * Link tables are intentionally omitted here:
 * - clinician_team
 * - patient_team
 */

/**
 * @typedef {'admin'|'patient'|'clinician'} UserType
 */

/**
 * @typedef {'male'|'female'|'other'|'unknown'} SexType
 */

/**
 * @typedef {'clinician_member'|'clinician_owner'|'patient'} TeamInvitationRoleType
 */

/**
 * @typedef {Object} User
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier
 * @property {!string} email - user email address
 * @property {!string} hashed_password - password hash
 * @property {?string} last_login_at - last login timestamp, or null if the user has not logged in
 * @property {!string} created_at - creation timestamp
 * @property {!UserType} role - user role
 */

/**
 * @typedef {Object} Team
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier
 * @property {!string} name - team name
 * @property {!string} contact_details - team contact details
 * @property {!Array<string>} institutions - institutions associated with the team
 * @property {!string} created_at - creation timestamp
 */

/**
 * @typedef {Object} Clinician
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier
 * @property {!number} user_id - linked user id
 * @property {!string} first_names - clinician first names
 * @property {!string} second_names - clinician second names
 * @property {!string} created_at - creation timestamp
 */

/**
 * @typedef {Object} Patient
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier
 * @property {?number} user_id - linked user id, or null if not linked
 * @property {!string} first_names - patient first names
 * @property {!string} second_names - patient second names
 * @property {!string} date_of_birth - date of birth in ISO date format
 * @property {!SexType} sex - patient sex
 * @property {?string} email - patient email address, or null
 * @property {?string} phone_number - patient phone number, or null
 * @property {!string} created_at - creation timestamp
 */

/**
 * @typedef {Object} TeamInvitation
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier
 * @property {!number} team_id - linked team id
 * @property {?number} clinician_id - linked clinician id, or null when inviting a patient
 * @property {?number} patient_id - linked patient id, or null when inviting a clinician
 * @property {!TeamInvitationRoleType} role - invitation role
 * @property {!string} code - invitation code
 * @property {!Object} invitation_messages - JSON payload with invitation messages
 * @property {!string} expires_at - expiration timestamp
 * @property {!number} failed_attempts - number of failed attempts
 * @property {!string} created_at - creation timestamp
 */

export const Types = {}
