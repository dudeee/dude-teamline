import { expect } from 'chai';
import _ from 'lodash';
import askForActions from '../build/jobs/ask-for-actions';
import dailySchedule from '../build/jobs/daily-schedule';
import goalReminder from '../build/jobs/goal-reminder';
import messageUrl from '../build/functions/message-url';
import { teamline, slack } from './fixtures';
import initialize from './initialize';
import cleanup from './cleanup';
import moment from 'moment';

const LONG_DELAY = 10000;

describe('jobs', function jobs() {
  this.timeout(LONG_DELAY);

  let bot;
  let app;
  let uri;
  let socket;
  before(async () => {
    const initialized = await initialize();
    bot = initialized.bot;
    app = initialized.app;
    uri = initialized.uri;
    socket = initialized.socket;
  });

  describe('ask-for-actions', function functions() {
    before(() => {
      app.get('/employee', (request, response, next) => {
        response.json(teamline.users[0]);
        next();
      });

      app.get('/employees', (request, response, next) => {
        response.json(teamline.users.slice(0, 1));
        next();
      });
    });

    describe('function', () => {
      let job;
      before(async () => {
        _.set(bot.config, 'teamline.actions.ask.delay', 5);
        job = await askForActions(bot, uri);
        await bot.pocket.del('teamline.notified');
      });

      it('should work well in case of everything being valid', done => {
        const user = teamline.users[0];
        app.get('/employee/:id/actions/today', (request, response, next) => {
          expect(+request.params.id).to.equal(user.id);
          response.json([]);
          next();
        });

        app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
          expect(+request.params.id).to.equal(user.id);
          response.json([]);
          next();
        });

        app.get('/employee/:id/workhours', (request, response, next) => {
          expect(+request.params.id).to.equal(user.id);
          response.json([{
            weekday: moment().weekday(),
            Timeranges: [{
              start: moment().subtract(5, 'minutes').format('HH:mm'),
              end: moment().add(2, 'hours').format('HH:mm'),
            }],
          }]);
          next();
        });

        app.get('/im.open', (request, response, next) => {
          bot.ims.push({
            user: slack.users[0].id,
            id: 'D123456',
          });
          response.json({
            ok: true,
            channel: bot.ims[bot.ims.length - 1],
          });
          next();
        });

        socket.on('message', async message => {
          const msg = JSON.parse(message);
          expect(msg.channel).to.equal('D123456');

          const list = await bot.pocket.get('teamline.notified');
          const notified = _.find(list, { id: user.id });

          expect(notified).to.be.ok;
          app._router.stack.length -= 4;
          socket._events.message.length -= 1;
          done();
        });

        job.job();
      });

      it('should not send a message if there is a TeamlineNotified record of user', async () => {
        const user = teamline.users[0];
        await bot.pocket.put('teamline.notified', [{
          id: user.id,
          expireAt: moment().add(1, 'day'),
        }]);

        const r = await job.job();
        expect(r.skipped).to.equal(slack.users.length);
      });

      it('should not send a message if the employee has actions for today', async () => {
        app.get('/employee/:id/actions/today', (request, response, next) => {
          response.json(teamline.actions);
          next();
        });

        const r = await job.job();
        expect(r.skipped).to.equal(slack.users.length);
        app._router.stack.length -= 1;
      });

      it('should not send a message if the employee does\'nt have workhours for the day', async () => { // eslint-disable-line
        app.get('/employee/:id/actions/today', (request, response, next) => {
          response.json([]);
          next();
        });

        app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
          response.json([]);
          next();
        });

        app.get('/employee/:id/workhours', (request, response, next) => {
          response.json([]);
          next();
        });

        const r = await job.job();
        expect(r.skipped).to.equal(slack.users.length);
        app._router.stack.length -= 3;
      });

      it('should not send a message if the specified delay has not passed yet', async () => {
        const user = teamline.users[0];
        app.get('/employee/:id/actions/today', (request, response, next) => {
          expect(+request.params.id).to.equal(user.id);
          response.json([]);
          next();
        });

        app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
          expect(+request.params.id).to.equal(user.id);
          response.json([]);
          next();
        });

        app.get('/employee/:id/workhours', (request, response, next) => {
          expect(+request.params.id).to.equal(user.id);
          response.json([{
            weekday: moment().weekday(),
            Timeranges: [{
              start: moment().subtract(1, 'minutes').format('HH:mm'),
              end: moment().add(2, 'hours').format('HH:mm'),
            }],
          }]);
          next();
        });

        const r = await job.job();
        expect(r.skipped).to.equal(slack.users.length);
        app._router.stack.length -= 3;
      });
    });

    after(cleanup);
  });

  describe('daily-schedule', function functions() {
    this.timeout(LONG_DELAY);

    before(async () => {
      app.get('/employee', (request, response, next) => {
        response.json(teamline.users[0]);
        next();
      });

      app.get('/employees', (request, response, next) => {
        response.json(teamline.users.slice(0, 1));
        next();
      });

      app.get('/employee/:id/workhours', (request, response, next) => {
        expect(+request.params.id).to.equal(teamline.users[0].id);

        response.json([{
          weekday: moment().weekday(),
          Timeranges: [{
            start: '8:30',
            end: '18:00',
          }],
        }]);

        next();
      });

      app.get('/team.info', (request, response, next) => {
        response.json({
          ok: true,
          team: {
            domain: 'test',
          },
        });

        next();
      });
    });

    describe('function', () => {
      let job;
      before(async () => {
        job = await dailySchedule(bot, uri);
      });

      it('should notify about today\'s modifications', async done => {
        await bot.pocket.put('teamline.schedules.notify.messages', [{
          modification: 'mod_id',
          message: '123456',
        }]);

        const start = moment('8:30', 'HH:mm');
        const end = moment('9:00', 'HH:mm');

        app.get('/schedulemodifications/accepted', (request, response, next) => {
          const today = moment().hours(0).minutes(0).seconds(0).milliseconds(0);

          expect(request.query.start.$gte).to.equal(today.toISOString());
          expect(request.query.end.$lt).to.equal(today.clone().add(1, 'day').toISOString());

          response.json([{
            id: 'mod_id',
            type: 'sub',
            start: start.toISOString(),
            end: end.toISOString(),
            Employee: teamline.users[0],
          }]);

          next();
        });

        app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
          expect(+request.params.id).to.equal(teamline.users[0].id);
          expect(request.query.id.$not).to.equal('mod_id');

          response.json([]);

          next();
        });

        app.get('/chat.postMessage', async (request, response, next) => {
          const [attachment] = JSON.parse(request.query.attachments);
          const user = slack.users[0];
          const text = bot.t('teamline.schedules.notification.arrive', {
            date: end.calendar(moment(), {
              someElse: 'at HH:mm, dddd D MMMM',
            }),
            names: [],
            reason: '',
          });


          const channel = _.get(bot.config, 'teamline.schedules.notification.channel', 'schedules');
          expect(attachment.author_name).to.equal(user.name);
          expect(attachment.author_icon).to.equal(user.profile.image_48);

          const url = await messageUrl(bot, channel, '123456');
          expect(attachment.author_link).to.equal(url);
          expect(attachment.text).to.equal(text);

          response.json({
            ok: true,
          });

          next();

          app._router.stack.length -= 3;
          done();
        });

        job.job();
      });
    });

    after(cleanup);
  });

  describe('goal-reminder', function functions() {
    this.timeout(LONG_DELAY);

    before(async () => {
      app.get('/goals', (request, response, next) => {
        response.json(teamline.goals);
        next();
      });
    });

    let job;
    before(async () => {
      job = await goalReminder(bot, uri);
    });

    it('should send a message to goal owner with time left until deadline', async done => {
      app.get('/chat.postMessage', (request, response, next) => {
        const { text } = request.query;

        moment.relativeTimeThreshold('h', 20);
        const expected = bot.t('teamline.goals.reminder', {
          left: moment().add(1, 'day').toNow(true),
          goal: teamline.goals[0].name,
          owner: slack.users[0].name,
        });

        expect(text).to.equal(expected);

        next();
        done();
        app._router.stack.length -= 1;
      });

      job.job();
    });

    after(cleanup);
  });
})
