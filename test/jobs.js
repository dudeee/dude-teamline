import { expect } from 'chai';
import _ from 'lodash';
import askForActions from '../build/jobs/ask-for-actions';
import { teamline, slack } from './fixtures';
import initialize from './initialize';
import cleanup from './cleanup';
import moment from 'moment';

const LONG_DELAY = 10000;

describe('ask-for-actions', function functions() {
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
    });

    beforeEach(async () => {
      await bot.pocket.remove('TeamlineNotified', { id: teamline.users[0].id }).exec();
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
            end: moment().add(2, 'hours').format('HH:mm')
          }]
        }]);
        next();
      });

      app.get('/im.open', (request, response, next) => {
        bot.ims.push({
          user: slack.users[0].id,
          id: 'D123456'
        });
        response.json({
          ok: true,
          channel: bot.ims[bot.ims.length - 1]
        });
        next();
      });

      socket.on('message', async message => {
        const msg = JSON.parse(message);
        expect(msg.channel).to.equal('D123456');

        const notified = await bot.pocket.find('TeamlineNotified', { id: user.id }).exec();

        expect(notified).to.be.ok;
        app._router.stack.length -= 4;
        delete socket._events.message;
        done();
      });

      job.job();
    });

    it('should not send a message if there is a TeamlineNotified record of user', async () => {
      const user = teamline.users[0];
      bot.pocket.save('TeamlineNotified', { id: user.id });

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
            end: moment().add(2, 'hours').format('HH:mm')
          }]
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
