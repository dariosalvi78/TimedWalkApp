# Security strategies

Partially based on https://neciudan.dev/most-secure-way-to-store-auth-token

## Users and roles

There are 3 types of users:

- admin: they have access to any data and can initialise any procedure
- clinician: they are associated to "teams" and can only access data belonging to patients who are in turn associated to the same teams. They can create patients accounts and can invite them to join teams. In each team, certain clinicians can be selected as owners and nivite other clinicians to the same team. Clinicians access the system through the web interface, and use a passwordless (email confirmation) system to login.
- patient: they perform tests and send them to the server. Their profile is created by clinicians who can also invite them to a team. The patient access the system through an app, through which they accept invitations, which logs them in, on that app/phone. To login again, for example after session expiry or when changing phone, patients need to be re-invited to the team. [In the future we may offer a web interface as well, with the same passwordless strategy based on email.]

## User creation flows

Admin: is always created at startup by the system itself (using env variables, which should be hidden after the first initialization)

Clinician: is created by the user when accepting an invitation to a team. Admins or clinicians with team owner role can create an invitation, which is sent by email. The email contains a unique, short lived code (24h or similar). The recipient of the invitation has to insert the code on the system, and if it is verified, create the account with user details.

-- when inviting a clinician, if the email is already registered in a user account, the invite will be automatically linked to the existing account.

Patient: is created by a clinician. After creation, an invite with a code is shared with the patient by email, or any other channel. [In the future, we may support users creating they own accounts directly.]

-- when creating a patient account, if the details of the account exist already, the account is flagged as probably existing and the clinician can simply reuse it.

## Authenticaiton flows

There are 2 major flows: patients through app and clinicians through web.

### Patient authentication through app

The patient receives an invitation to join a team. The invitation contains a unique, 6 digits, code, with relatively close expiry date (few days, possibly 1).
The user enters the code in the app, which verify it exists and, upon acceptance, send back a session token, which is geneated randomly and with enough length (32-byte/256-bit at least). These tokens are long-lived (weeks, even months, depending on expected frequency of use) and are managed by the app JS code, stored in native storage (not localstorage, which can be wipred out) and sent back to API calls as security header: `Authorization: Bearer abc123`.

Tokens will be refreshed by the app automatically with a timer, and with Cordova lifecycle events (`pause`/`resume`) to account for OS-level app freezing.

Re-authentication requries a clinician to manually issue a new team invite every time the user is logged out. In the future we can allow patients to login also with their email address and a one time code to avoid additional work to clinicians.

### Clinician authentication through web

The clinician receives a code to join a team, creates a user and, upon acceptance, receives a session token as httpOnly cookie, with high security settings: `Set-Cookie: __Host-Http--session=abc123; HttpOnly; Secure; SameSite=Strict; Path=/`. The token is stored by the browser and sent back to the server in every request automatically. The session token is not long-lived (a few hours), therefore further logins are necessary.

The cookie, given that has no `Expires` and `Max-Age`, is a session cookie and is deleted when the tab is closed by the browser.

A login is passwordless: the user enters the email on the web, if an account exists, an email is sent with a short-lived (minutes) access code of 6 digits, that is used to enter the website. If the code/email pair is verified, the server sets the httpOnly cookie, similarly to what is done above.

Additional security measures are introduced for the web environment:

**CSRF token:**

In addition to the session token, a random CSRF token is also generated as a random value and sent to the client in the API reply.
The token is stored in a separate cookie that is readable to the JS application but is not `HttpOnly`: `__Host-csrf=323242342342; Secure; SameSite=Strict; Path=/`.
The JS app reads this cookie and sends it back in a header such as:
`X-CSRF-Token: 323242342342`.

The CSRF token has the same life as the session token, but it is not automatically included by the browser, so it cannot be leaked by mistake in a CSRF attack. The session cookie remains `HttpOnly`, while the CSRF cookie is kept separate to reduce the impact of XSS without losing CSRF protection.

This is the (synchronizer pattern)[https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern] recommended by OWASP.

**High security authentication flow:**

A login in the app is only initiated by a clinician sending the invitation code, therefore it's hardly forgeable. However, a clinician's login can be forged if an attacker takes control of the clinician's email. This can be de-risked by detecting an unusual login request and asking an additional security question, which cannot be easily derived.

The client stores a log-lived (months) additional identifier that identifies the device. This identifier is generated as a uuidv4 and is stored as a http-only cookie by the browser (example: `Set-Cookie: __Host-Http-device-id=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Expires: Sun, 01 Jan 2027 00:00:00 GMT`). This cookie is set if the user explicitly confirms, when logging in the first time that: "This is my personal/private device."

The server will check if the device identifier is known for the user and if it is not, it will require an additional verification step asking for an information from the user.

- Absolute Expiration (`absoluteExpiresAt`) should apply to ALL web sessions as a hard cap, but can be set longer for trusted devices (e.g., 12 hours) vs untrusted devices (e.g., 2 hours). When hit, prompt an inline re-authentication modal so active work is not lost.

The security question should be something that the user knows and does not need to remember only for this system. For example:

- the name of your first pet
- make of your first car
- elementary school you attended

We can allow setting more than one security question at registration.

To consider: it can be possible to also geo-reference the IP address, for example with https://apiip.net/ and step up security if device id is OK but location is not the usual one.

**Session refresh and forced logouts:\***

Session refresh is issued by the application with a specific API call that is triggered when the user interacts with the web page (on clicks and taps). The web application should avoid refreshing the tokens using a timer, else if the webpage is left opened it will be kept logged in forever, which may be a problem on public computers.

When in a high security authentication flow, after acceptance of code and security answer, users are additionally asked if the device they are accessing the website is personal and trusted. If the answer is yes, the device id cookie is sent, otherwise it is not sent.

When checking the session id, at each API call beyond authorization, the server will check 2 expiry timestamps:

- one for inactivity, that is shorter lived (minutes) and refreshed by the web application
- only if the identified client is web (recognised because of session id in cookie), and if there is no device id set (thus it's a untrusted client), a second un-resettable expiration timestamp is also checked. This, in practice, forces a logout after a certain number of hours, no matter how much the user uses the website.

**Brute forcing:**

Failed login attempts are recorded and if there are too many failed attempts, the user will be locked out.

Recovery in this case must be manual and done by an admin.

**Patients' logins through emails:**

Note: if we allow patients to login into the web similar measures are necessary for them too. If we allow non-team dependent logins, using patients' emails, the same mechanisms must be in place also on the app (except for longer living session tokens, to guarantee usability).

### Tokens refresh

The app takes care of refreshing the session token before expiration.

todo: expiry at + hard expiry for public devices...

## Security analysis

- CSFR: on web access. It is mitigated by using SameSite=Strict cookies and by using a CSRF token that is sent in a header. In app it is not needed since the webview lives in a separate context than the general browser.
- XSS: mitigated by using httpOnly cookies in the web interface. In app it is still possible, so additional measures are needed such as input sanitization and a strict Content Security Policy (CSP).
- MITM: mitigated by using HTTPS and by using long random tokens.
- Control over user email: mitigated by the high security authentication flow.
- Brute force: mitigated by failed login attempts and by using a strong secret key to sign the tokens.

Fu\*k up scenarios:

- malicious JS code leaking through a dependency or a compromised server.
- Attacker controls user email and knows the answer to the security question.
