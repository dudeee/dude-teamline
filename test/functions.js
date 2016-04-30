import sinon from 'sinon';
import { expect } from 'chai';
import _ from 'lodash';
import findEmployee from '../build/functions/find-employee';
import logActions from '../build/functions/log-actions';
import updateActionsMessage from '../build/functions/update-actions-message';
import workhoursModifications from '../build/functions/workhours-modifications';
import notifyColleagues from '../build/functions/notify-colleagues';
import parseDate from '../build/functions/parse-date';
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
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

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
        start: moment('20:00', 'HH:mm').weekday(0),
        end: moment('21:00', 'HH:mm').weekday(0)
      }];

      const calculated = workhoursModifications(bot, workhours, modifications);

      expect(calculated[0].Timeranges.length).to.equal(2);
      expect(calculated[0].modified).to.equal(true);
      const modified = calculated[0].Timeranges[1];
      expect(modified.start).to.equal('20:00');
      expect(modified.end).to.equal('21:00');
    });

    it('should remove modifications with the same start and end time', () => {
      const workhours = [{
        weekday: 0,
        Timeranges: [{
          start: '8:30:00',
          end: '8:30'
        }]
      }];

      const modifications = [];

      const calculated = workhoursModifications(bot, workhours, modifications);
      expect(calculated[0].Timeranges.length).to.equal(0);
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
        start: moment('9:00', 'HH:mm').weekday(0),
        end: moment('16:00', 'HH:mm').weekday(0)
      }];


      const calculated = workhoursModifications(bot, workhours, modifications);

      expect(calculated[0].Timeranges.length).to.equal(2);
      expect(calculated[0].modified).to.equal(true);

      const [first, second] = calculated[0].Timeranges;
      expect(first.start).to.equal('8:30');
      expect(first.end).to.equal('09:00');

      expect(second.start).to.equal('16:00');
      expect(second.end).to.equal('18:00');
    });

    // TODO: There is still a case when we apply an `out` on top of an `in` that doesn't work
    it('should not get confused with multiple add/sub modifications', () => {
      const workhours = [{
        weekday: 0,
        Timeranges: [{
          start: '8:30',
          end: '18:00'
        }]
      }];

      const modifications = [{
        type: 'add',
        start: moment('19:00', 'HH:mm').weekday(0),
        end: moment('20:00', 'HH:mm').weekday(0)
      }, {
        type: 'sub',
        start: moment('9:00', 'HH:mm').weekday(0),
        end: moment('11:00', 'HH:mm').weekday(0)
      }];

      // expected:
      // 8:30 to 9:00
      // 11:00 to 18:00
      // 19:00 to 20:00

      const [calculated] = workhoursModifications(bot, workhours, modifications);

      expect(calculated.Timeranges.length).to.equal(3);
      const [first, second, third] = calculated.Timeranges;

      expect(first.start).to.equal('8:30');
      expect(first.end).to.equal('09:00');

      expect(second.start).to.equal('11:00');
      expect(second.end).to.equal('18:00');

      expect(third.start).to.equal('19:00');
      expect(third.end).to.equal('20:00');
    });

    it('should merge modifications when their end and start collide', () => {
      const workhours = [{
        weekday: 0,
        Timeranges: [{
          start: '8:30',
          end: '18:00'
        }]
      }];

      const modifications = [{
        type: 'add',
        start: moment('18:00', 'HH:mm').weekday(0),
        end: moment('21:00', 'HH:mm').weekday(0)
      }, {
        type: 'add',
        start: moment('21:00', 'HH:mm').weekday(0),
        end: moment('21:10', 'HH:mm').weekday(0)
      }];

      const [calculated] = workhoursModifications(bot, workhours, modifications);

      expect(calculated.Timeranges.length).to.equal(1);
      expect(calculated.modified).to.equal(true);

      const [timerange] = calculated.Timeranges;
      expect(timerange.start).to.equal('8:30');
      expect(timerange.end).to.equal('21:10');
    });

    after(cleanup);
  });

  describe('parse-date', () => {
    it('should add `in` to the string in case it\'s missing', () => {
      const d = moment().add(2, 'hours').toString();
      const date = parseDate(bot, '2 hours').toString();
      expect(d).to.equal(date);
    });

    it('should strip down keywords from|until|till', () => {
      const d = moment().add(2, 'hours').toString();
      const date = parseDate(bot, 'from 2 hours').toString();
      expect(d).to.equal(date);
    });

    it('should take the first part separated by `for` as base, and next part as duration', () => {
      const first = moment().add(1, 'day').hours(0).minutes(0).seconds(0).milliseconds(0);
      const second = first.clone().add(1, 'hour');
      const range = parseDate(bot, 'tomorrow for 1 hour');
      expect(range.range).to.be.ok;

      const from = range.from;
      const to = range.to;

      almostEqual(first, from);
      almostEqual(second, to);
    });

    it('should return a range if the string is split using to|-|until|till', () => {
      const first = moment().add(2, 'hours').toString();
      const second = moment().add(3, 'hours').toString();

      const range = parseDate(bot, 'from 2 hours to 3 hours');
      expect(range.range).to.be.ok;

      const from = range.from.toString();
      const to = (range.to).toString();

      expect(first).to.equal(from);
      expect(second).to.equal(to);
    });

    it('should set the first date as base if the second one is smaller than the first', () => {
      const first = moment().add(1, 'day').hours(0).minutes(0).seconds(0).toString();
      const second = moment().add(1, 'day').hours(8).minutes(0).seconds(0).toString();

      const range = parseDate(bot, 'tomorrow until 8:00');
      expect(range.range).to.be.ok;

      const from = range.from.toString();
      const to = range.to.toString();

      expect(first).to.equal(from);
      expect(second).to.equal(to);
    });
  });

  describe('notify-colleagues', () => {
    before(() => {
      _.set(bot.config, 'teamline.schedules.notification.mentionTeams', true);
      app.get('/employee/:id/teams/open', (request, response, next) => {
        response.json([{
          name: 'test'
        }]);
        next();
      });

      app.get('/employee/:id/workhours', (request, response, next) => {
        response.json([{
          weekday: 0,
          Timeranges: [{
            start: '8:00',
            end: '18:00'
          }]
        }]);

        next();
      });
    });
    it('should not send any message in case of no modifications', async () => {
      const r = await notifyColleagues(bot, uri, [], teamline.users[0]);
      expect(r).to.equal(false);
    });

    it('should notify out modifications', async done => {
      const start = moment('8:30', 'HH:mm').weekday(0);
      const end = moment('9:00', 'HH:mm').weekday(0);

      app.get('/chat.postMessage', (request, response, next) => {
        const text = bot.t('teamline.schedules.notification.out', {
          user: `@${teamline.users[0].username}`,
          start: start.calendar(),
          end: end.calendar(),
          teams: '@test'
        });
        expect(request.query.text).to.equal(text);
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

        app._router.stack.length -= 1;

        done();
        next();
      });

      const modification = {
        type: 'sub',
        start, end
      };

      const r = await notifyColleagues(bot, uri, [modification], teamline.users[0]);
      expect(r).to.equal(true);
    });

    it('should notify in modifications', async done => {
      const start = moment('18:30', 'HH:mm').weekday(0);
      const end = moment('19:00', 'HH:mm').weekday(0);

      app.get('/chat.postMessage', (request, response, next) => {
        const text = bot.t('teamline.schedules.notification.in', {
          user: `@${teamline.users[0].username}`,
          start: start.calendar(),
          end: end.calendar(),
          teams: '@test'
        });
        expect(request.query.text).to.equal(text);
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

        app._router.stack.length -= 1;

        done();
        next();
      });

      const modification = {
        type: 'add',
        start, end
      };

      const r = await notifyColleagues(bot, uri, [modification], teamline.users[0]);
      expect(r).to.equal(true);
    });

    it('should give information on both `in` and `out` when using `shift`', async done => {
      const start = moment('8:30', 'HH:mm').weekday(0);
      const end = moment('9:00', 'HH:mm').weekday(0);
      const inStart = moment('18:00', 'HH:mm').weekday(0);
      const inEnd = moment('18:30', 'HH:mm').weekday(0);

      let i = 0;
      const expected = [
        bot.t('teamline.schedules.notification.out', {
          user: `@${teamline.users[0].username}`,
          start: start.calendar(),
          end: end.calendar(),
          teams: '@test'
        }),
        bot.t('teamline.schedules.notification.in', {
          user: `@${teamline.users[0].username}`,
          start: inStart.calendar(),
          end: inEnd.calendar(),
          teams: '@test'
        })
      ];
      app.get('/chat.postMessage', (request, response, next) => {
        const text = expected[i++];
        expect(request.query.text).to.equal(text);
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

        app._router.stack.length -= 1;
        done();
        next();
      });

      const modifications = [{
        type: 'sub',
        start, end
      }, {
        type: 'add',
        start: inStart,
        end: inEnd
      }];

      const r = await notifyColleagues(bot, uri, modifications, teamline.users[0]);
      expect(r).to.equal(true);
    });

    it('should notify `leave` if the `out` extends to end of working hour', async done => {
      const start = moment('15:30', 'HH:mm').weekday(0);
      const end = moment('18:00', 'HH:mm').weekday(0);

      app.get('/chat.postMessage', (request, response, next) => {
        const text = bot.t('teamline.schedules.notification.leave', {
          user: `@${teamline.users[0].username}`,
          date: start.calendar(moment(), {
            someElse: 'at HH:mm, dddd D MMMM'
          }),
          teams: '@test'
        });
        expect(request.query.text).to.equal(text);
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

        app._router.stack.length -= 1;

        done();
        next();
      });

      const modification = {
        type: 'sub',
        start, end
      };

      const r = await notifyColleagues(bot, uri, [modification], teamline.users[0]);
      expect(r).to.equal(true);
    });

    it('should notify `arrive` if the `out` starts from beginning of working hour', async done => {
      const start = moment('8:00', 'HH:mm').weekday(0);
      const end = moment('9:00', 'HH:mm').weekday(0);

      app.get('/chat.postMessage', (request, response, next) => {
        const text = bot.t('teamline.schedules.notification.arrive', {
          user: `@${teamline.users[0].username}`,
          date: end.calendar(moment(), {
            someElse: 'at HH:mm, dddd D MMMM'
          }),
          teams: '@test'
        });
        expect(request.query.text).to.equal(text);
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

        app._router.stack.length -= 1;

        done();
        next();
      });

      const modification = {
        type: 'sub',
        start, end
      };

      const r = await notifyColleagues(bot, uri, [modification], teamline.users[0]);
      expect(r).to.equal(true);
    });

    it('should notify `absent` if the `out` for a whole day', async done => {
      const start = moment('8:00', 'HH:mm').weekday(0);
      const end = moment('18:00', 'HH:mm').weekday(0);

      app.get('/chat.postMessage', (request, response, next) => {
        const text = bot.t('teamline.schedules.notification.absent', {
          user: `@${teamline.users[0].username}`,
          date: start.calendar(null, {
            sameDay: '[Today]',
            nextDay: '[Tomorrow]',
            nextWeek: 'dddd',
            lastDay: '[Yesterday]',
            lastWeek: '[Last] dddd',
            sameElse: 'dddd D MMMM'
          }),
          teams: '@test'
        });
        expect(request.query.text).to.equal(text);
        expect(request.query.username).to.equal(teamline.users[0].username);
        expect(request.query.icon_url).to.equal(bot.users[0].profile.image_48);

        app._router.stack.length -= 1;

        done();
        next();
      });

      const modification = {
        type: 'sub',
        start, end
      };

      const r = await notifyColleagues(bot, uri, [modification], teamline.users[0]);
      expect(r).to.equal(true);
    });

    after(cleanup);
  });

  after(cleanup);
  after(() => {
    bot.config.teamline.actionsChannel = false;
    bot.config.teamline.teamsChannels = false;
    _.set(bot.config, 'teamline.schedules.notification.mentionTeams', false);
  });
});

const almostEqual = (d1, d2) => expect(Math.abs(moment(d1).diff(d2, 'seconds'))).to.be.lt(2);
