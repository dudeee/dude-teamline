export const slack = {
  users: [{
    id: 'U123456',
    name: 'test',
    is_bot: false,
    profile: {
      first_name: 'Mr',
      last_name: 'Test',
      email: 'test@test.com',
      phone: '919999999'
    }
  }, {
    id: 'U234567',
    name: 'someone',
    is_bot: false,
    profile: {
      first_name: 'Mr',
      last_name: 'Test',
      email: 'test@test.com',
      phone: '919999999'
    }
  }, {
    id: 'U345678',
    name: 'the guy',
    is_bot: false,
    profile: {
      first_name: 'The Great',
      last_name: 'Cyrus',
      email: 'cyrus@test.com',
      phone: '918999999'
    }
  }],

  channels: [{
    id: 'C123456',
    name: 'some-team'
  }, {
    id: 'C123457',
    name: 'actions'
  }, {
    id: 'C123458',
    name: 'office'
  }],

  ims: [],
  groups: [],
  bots: [],

  self: {
    name: 'bot',
    profile: {}
  }
};

export const teamline = {
  users: [{
    id: 0,
    username: slack.users[0].name,
    email: slack.users[0].email,
    phone: slack.users[0].phone,
    firstname: slack.users[0].first_name,
    lastname: slack.users[0].last_name,
    TeamId: 0,
  }, {
    id: 1,
    username: slack.users[1].name,
    firstname: slack.users[1].profile.first_name,
    lastname: slack.users[1].profile.last_name,
    email: slack.users[1].profile.email,
    phone: slack.users[1].profile.phone,
    TeamId: 0
  }, {
    id: 2,
    username: slack.users[2].name,
    firstname: slack.users[2].profile.first_name,
    lastname: slack.users[2].profile.last_name,
    email: slack.users[2].profile.email,
    phone: slack.users[2].profile.phone,
    ManagerOf: 0
  }],

  teams: [{
    id: 0,
    name: 'some team'
  }],

  projects: [{
    id: 0,
    name: 'some project',
    TeamId: 0
  }, {
    id: 1,
    name: 'some other project'
  }, {
    id: 2,
    name: 'closed project',
    closed: true,
    TeamId: 0
  }],

  roles: [{
    id: 0,
    name: 'some role',
    TeamId: 0
  }, {
    id: 1,
    name: 'some other role',
    TeamId: 0
  }],

  actions: [{
    id: 0,
    name: 'some action',
    date: Date.now(),
    ProjectId: 0,
    UserId: 0
  }, {
    id: 1,
    name: 'some other action',
    date: Date.now(),
    RoleId: 0,
    UserId: 1
  }]
};
