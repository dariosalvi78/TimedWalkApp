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
 * @property {!number} failed_login_attempts - failed login attempts number
 * @property {?string} last_login_at - last login timestamp, or null if the user has not logged in
 * @property {!string} created_at - creation timestamp
 * @property {!UserType} role - user role
 */

/**
 * @typedef {Object} LoginCode
 * @property {!string} email - email address associated with the login code
 * @property {!string} code - one-time 6-digit numeric login code
 * @property {!string} expires_at - expiration timestamp
 * @property {!string} created_at - creation timestamp
 */

/**
 * @typedef {Object} UserSecurityQuestion
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier
 * @property {!number} user_id - linked user id
 * @property {!string} question - the security question
 * @property {!string} answer_hash - hashed version of the security answer
 * @property {!string} created_at - creation timestamp
 */

/**
 * @typedef {Object} UserSession
 * @property {!number} user_id - linked user id
 * @property {!string} session_id - unique session id (primary key)
 * @property {!string} csfr_code - CSFR token bound to the session
 * @property {!boolean} is_public_client - whether this session belongs to a public client
 * @property {!string} expires_at - expiration timestamp
 * @property {?string} public_client_hard_expiry_at - hard expiration timestamp for public clients, or null
 * @property {!string} created_at - creation timestamp
 */

/**
 * @typedef {Object} UserSessionWithUser
 * @property {!number} user_id - linked user id
 * @property {!string} session_id - unique session id (primary key)
 * @property {!string} csfr_code - CSFR token bound to the session
 * @property {!boolean} is_public_client - whether this session belongs to a public client
 * @property {!string} expires_at - expiration timestamp
 * @property {?string} public_client_hard_expiry_at - hard expiration timestamp for public clients, or null
 * @property {!string} created_at - creation timestamp
 * @property {!User} user - associated user information
 */

/**
 * @typedef {Object} UserDeviceId
 * @property {!number} id - internal identity column
 * @property {!string} p_id - public UUID identifier for the device installation
 * @property {!number} user_id - linked user id
 * @property {!string} last_accessed_at - timestamp of the last access
 * @property {!string} created_at - creation timestamp
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
 * @property {!string} email - email address of the invitee
 * @property {!TeamInvitationRoleType} role - invitation role
 * @property {!string} code - invitation code
 * @property {!Object} invitation_message - JSON payload with invitation messages
 * @property {!string} expires_at - expiration timestamp
 * @property {!number} failed_attempts - number of failed attempts
 * @property {!string} created_at - creation timestamp
 */

export const Types = {}
