export default {
  requestLoginCode: {
    title: 'Your login code for TimedWalk',
    body: 'Your login code is: {code}. It will expire at {expires_at}.',
  },
  sendTeamInvitation: {
    title: 'You have been invited to join a TimedWalk team',
    body: 'You have been invited to join the team "{team_name}" on TimedWalk. Please use the following invitation code to accept the invitation: {code}. The invitation will expire at {expires_at}.',
  },
  accountCreated: {
    title: 'An account has been created for TimedWalk',
    body: 'Your account has been created successfully by a team member.',
  },
  accountCreatedAndAssociatedWithTeam: {
    title: 'An account has been created and associated with a TimedWalk team',
    body: 'Your account has been created successfully and you have been associated with the team "{team_name}".',
  },
  aceptedTeamInvitation: {
    title: 'You have accepted the invitation to join a TimedWalk team',
    body: 'You have successfully accepted the invitation to join the team "{team_name}".',
  }
}
