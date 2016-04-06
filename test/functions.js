import sinon from 'sinon';
import { expect } from 'chai';
import _ from 'lodash';
import findEmployee from '../build/functions/find-employee';
import logActions from '../build/functions/log-actions';
import updateActionsMessage from '../build/functions/update-actions-message';
import workhoursModifications from '../build/functions/workhours-modifications';
import moment from 'moment';
import { teamline } from './fixtures';
import initialize from './initialize';
import cleanup from './cleanup';

const LONG_DELAY = 10000;

describe('functions', function functions() {
  this.timeout(LONG_DELAY);

  let bot;
  let app;
  let uri;
  before(async () => {
    const initialized = await initialize();
    bot = initialized.bot;
    bot.config.teamline.actionsChannel = true;
    bot.config.teamline.teamsChannels = true;
    app = initialized.app;
    uri = initialized.uri;
  });

  describe('find-employee', () => {
    it('should request `message.user` in case of me/my/myself', async () => {
      const spy = sinon.spy();
      app.get('/employee', (request, response, next) => {
        expect(request.query.username).to.equal(bot.users[0].name);

        response.json(teamline.users[0]);
        next();
      });
      app.get('/employee', spy);

      const message = {
        user: bot.users[0].id
      };

      await findEmployee(uri, bot, message, 'me');
      await findEmployee(uri, bot, message, 'my');
      await findEmployee(uri, bot, message, 'myself');
      expect(spy.callCount).to.equal(3);

      app._router.stack.length -= 2;
    });

    it('should return the employee if a username is specified', async () => {
      const spy = sinon.spy();
      app.get('/employee', (request, response, next) => {
        expect(request.query.username).to.equal(bot.users[1].name);

        response.json(teamline.users[1]);
        next();
      });
      app.get('/employee', spy);

      const message = {
        user: bot.users[0].id
      };

      await findEmployee(uri, bot, message, bot.users[1].name);
      await findEmployee(uri, bot, message, `@${bot.users[1].name}`);
      expect(spy.callCount).to.equal(2);

      app._router.stack.length -= 2;
    });

    it('should throw an error if the username does not exist', async (done) => {
      const message = {
        user: bot.users[0].id
      };

      try {
        await findEmployee(uri, bot, message, 'nonsense');
      } catch (e) {
        done();
      }
    });

    after(cleanup);
  });

  describe('log-actions', () => {
    before(() => {
      app.get('/employee/:id/teams', (request, response, next) => {
        const user = _.find(teamline.users, { id: +request.params.id });
        const teams = _.filter(teamline.teams, { id: user.TeamId });
        response.json(teams);
        next();
      });

      app.get('/team/:id/projects', (request, response, next) => {
        const team = _.find(teamline.teams, { id: +request.params.id });
        const projects = _.map(_.filter(teamline.projects, { TeamId: team.id }), project => (
          { ...project, Actions: _.filter(teamline.actions, { ProjectId: project.id }) }
        ));

        response.json(projects);
        next();
      });

      app.get('/team/:id/roles', (request, response, next) => {
        const team = _.find(teamline.teams, { id: +request.params.id });
        const roles = _.map(_.filter(teamline.roles, { TeamId: team.id }), role => (
          { ...role, Actions: _.filter(teamline.actions, { roleId: role.id }) }
        ));

        response.json(roles);
        next();
      });

      app.get('/action/:id', (request, response, next) => {
        const action = _.find(teamline.actions, { id: +request.params.id });
        const employee = _.find(teamline.users, { id: action.UserId });

        action.Employee = employee;
        response.json(action);
        next();
      });
    });

    it('should post role and project actions', (done) => {
      app.get('/channels.history', (request, response, next) => {
        response.json({
          ok: true,
          messages: []
        });

        next();
      });

      app.get('/chat.postMessage', (request, response, next) => {
        const channel = bot.find(request.query.channel);
        expect(channel.name).to.equal(teamline.teams[0].name.replace(/\s/g, '-'));

        const projects = _.map(_.filter(teamline.projects, { TeamId: 0 }), project => (
          { ...project, Actions: _.filter(teamline.actions, { ProjectId: project.id }) }
        ));
        const roles = _.map(_.filter(teamline.roles, { TeamId: 0 }), role => (
          { ...role, Actions: _.filter(teamline.actions, { roleId: role.id }) }
        ));

        projects.concat(roles).forEach(p => {
          p.Actions.forEach(action => {
            expect(request.query.text).to.have.string(action.name);
          });
        });

        done();
        next();
        app._router.stack.length -= 2;
      });

      logActions(bot, uri, teamline.users[0]);
    });

    it('should update role and project actions', (done) => {
      const head = 'Actions for today! :fist:';

      app.get('/channels.history', (request, response, next) => {
        response.json({
          ok: true,
          messages: [{
            text: head,
            ts: '123432'
          }]
        });

        next();
      });

      app.get('/chat.update', (request, response, next) => {
        const channel = bot.find(request.query.channel);
        expect(channel.name).to.equal(teamline.teams[0].name.replace(/\s/g, '-'));
        expect(request.query.ts).to.equal('123432');

        const projects = _.map(_.filter(teamline.projects, { TeamId: 0 }), project => (
          { ...project, Actions: _.filter(teamline.actions, { ProjectId: project.id }) }
        ));
        const roles = _.map(_.filter(teamline.roles, { TeamId: 0 }), role => (
          { ...role, Actions: _.filter(teamline.actions, { roleId: role.id }) }
        ));

        projects.concat(roles).forEach(p => {
          p.Actions.forEach(action => {
            expect(request.query.text).to.have.string(action.name);
          });
        });

        done();
        next();
        app._router.stack.length -= 2;
      });

      logActions(bot, uri, teamline.users[0]);
    });

    it('should remove message if actions are removed', (done) => {
      const head = 'Actions for today! :fist:';

      const backup = _.cloneDeep(teamline.actions);
      teamline.actions.length = 0;

      app.get('/channels.history', (request, response, next) => {
        response.json({
          ok: true,
          messages: [{
            text: head,
            ts: '123432'
          }]
        });

        next();
      });

      app.get('/chat.delete', (request, response, next) => {
        const channel = bot.find(request.query.channel);
        expect(channel.name).to.equal(teamline.teams[0].name.replace(/\s/g, '-'));
        expect(request.query.ts).to.equal('123432');

        done();
        next();
        teamline.actions = backup;
        app._router.stack.length -= 2;
      });

      logActions(bot, uri, teamline.users[0]);
    });

    after(cleanup);
  });

  describe('update-actions-message', () => {
    before(() => {
      app.get('/employee/:id/actions/today', (request, response, next) => {
        const user = _.find(teamline.users, { id: +request.params.id });
        const actions = _.map(_.filter(teamline.actions, { UserId: user.id }), action => (
          { ...action,
            Project: _.find(teamline.projects, { id: action.ProjectId }),
            Role: _.find(teamline.roles, { id: action.RoleId })
          }
        ));

        response.json(actions);
        next();
      });
    });

    it('should post a message to #actions channel', done => {
      app.get('/channels.history', (request, response, next) => {
        response.json({
          ok: true,
          messages: []
        });

        next();
      });

      app.get('/chat.postMessage', (request, response, next) => {
        const channel = bot.find(request.query.channel);
        expect(channel.name).to.equal('actions');

        const actions = _.filter(teamline.actioms, { UserId: 0 });
        actions.forEach(action => {
          expect(request.query.text).to.have.string(action.name);
        });

        done();
        next();
        app._router.stack.length -= 2;
      });

      updateActionsMessage(bot, uri, teamline.users[0]);
    });

    it('should update a message in #actions channel if a message already exists', done => {
      app.get('/channels.history', (request, response, next) => {
        response.json({
          ok: true,
          messages: [{
            text: `${teamline.users[0].firstname} ${teamline.users[0].lastname}`,
            ts: '123'
          }]
        });

        next();
      });

      app.get('/chat.update', (request, response, next) => {
        const channel = bot.find(request.query.channel);
        expect(channel.name).to.equal('actions');
        expect(request.query.ts).to.equal('123');

        const actions = _.filter(teamline.actions, { UserId: 0 });
        actions.forEach(action => {
          expect(request.query.text).to.have.string(action.name);
        });

        done();
        next();
        app._router.stack.length -= 2;
      });

      updateActionsMessage(bot, uri, teamline.users[0]);
    });

    it('should delete the message in #actions channel if actions are removed', done => {
      const backup = _.cloneDeep(teamline.actions);
      teamline.actions.length = 0;

      app.get('/channels.history', (request, response, next) => {
        response.json({
          ok: true,
          messages: [{
            text: `${teamline.users[0].firstname} ${teamline.users[0].lastname}`,
            ts: '123'
          }]
        });

        next();
      });

      app.get('/chat.delete', (request, response, next) => {
        const channel = bot.find(request.query.channel);
        expect(channel.name).to.equal('actions');
        expect(request.query.ts).to.equal('123');

        done();
        next();
        teamline.actions = backup;
        app._router.stack.length -= 2;
      });

      updateActionsMessage(bot, uri, teamline.users[0]);
    });

    after(cleanup);
  });

  describe('workhours-modifications', () => {
    it('should add modification hours to already scheduled days', () => {
      const workhours = [{
        weekday: 0,
        Timeranges: [{
          start: '8:30',
          end: '18:00'
        }]
      }];

      const modifications = [{
        type: 'add',
        start: moment().weekday(0).hours(20).minutes(0).seconds(0),
        end: moment().weekday(0).hours(21).minutes(0).seconds(0)
      }];

      const calculated = workhoursModifications(workhours, modifications);

      expect(calculated[0].Timeranges.length).to.equal(2);
      expect(calculated[0].modified).to.equal(true);
      const modified = calculated[0].Timeranges[1];
      expect(modified.start).to.equal('20:00');
      expect(modified.end).to.equal('21:00');
    });

    it('should remove modification hours from already scheduled days', () => {
      const workhours = [{
        weekday: 0,
        Timeranges: [{
          start: '8:30',
          end: '18:00'
        }]
      }];

      const modifications = [{
        type: 'sub',
        start: moment().weekday(0).hours(9).minutes(0).seconds(0),
        end: moment().weekday(0).hours(16).minutes(0).seconds(0)
      }];


      const calculated = workhoursModifications(workhours, modifications);

      expect(calculated[0].Timeranges.length).to.equal(2);
      expect(calculated[0].modified).to.equal(true);

      const [first, second] = calculated[0].Timeranges;
      expect(first.start).to.equal('8:30');
      expect(first.end).to.equal('09:00');

      expect(second.start).to.equal('16:00');
      expect(second.end).to.equal('18:00');
    });

    after(cleanup);
  });

  after(cleanup);
  after(() => {
    bot.config.teamline.actionsChannel = false;
    bot.config.teamline.teamsChannels = false;
  });
});
