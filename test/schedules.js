import { expect } from 'chai';
import commands from '../build/commands/index';
import { teamline } from './fixtures';
import initialize from './initialize';
import cleanup from './cleanup';

const LONG_DELAY = 10000;

describe('schedules', function functions() {
  this.timeout(LONG_DELAY);

  let bot;
  let app;
  let uri;
  before(async () => {
    const initialized = await initialize();
    bot = initialized.bot;
    app = initialized.app;
    uri = initialized.uri;

    app.get('/employee', (request, response, next) => {
      response.json(teamline.users[0]);
      next();
    });

    commands(bot, uri);
  });

  describe('work-hours', () => {
    describe('schedules set', () => {
      it('should set schedule for everyone using keywords `all` `default` and `everyone`', done => { //eslint-disable-line
        app.get('/employees', (request, response, next) => {
          response.json(teamline.users);
          next();
        });

        app.delete('/employee/:id/workhours', (request, response, next) => {
          response.json([]);
          next();
        });

        app.post('/employee/:id/workhour', (request, response, next) => {
          expect(+request.body.weekday).to.be.oneOf([0, 6]);
          response.json({
            id: 'workhour_id',
            ...request.body
          });
          next();
        });

        app.post('/workhour/:id/timerange', (request, response, next) => {
          expect(request.params.id).to.equal('workhour_id');
          expect(request.body.start).to.be.oneOf(['08:30', '10:00', '09:30']);
          expect(request.body.end).to.be.oneOf(['09:00', '18:00', '18:30']);
          response.json(request.body);

          done();
          next();

          app._router.stack.length -= 4;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };

        bot.inject('message', {
          text: `schedules set default
                 saturday > 8:30 - 9:00, 10:00 - 18:00
                 sunday > 9:30 - 18:30`,
          mention: true,
          user: bot.users[0].id
        });
      });

      it('should set schedule for specified user', done => { //eslint-disable-line
        app.delete('/employee/:id/workhours', (request, response, next) => {
          expect(+request.params.id).to.equal(teamline.users[0].id);
          response.json([]);
          next();
        });

        app.post('/employee/:id/workhour', (request, response, next) => {
          expect(+request.params.id).to.equal(teamline.users[0].id);
          expect(+request.body.weekday).to.be.oneOf([0, 6]);
          response.json({
            id: 'workhour_id',
            ...request.body
          });
          next();
        });

        app.post('/workhour/:id/timerange', (request, response, next) => {
          expect(request.params.id).to.equal('workhour_id');
          expect(request.body.start).to.be.oneOf(['08:30', '10:00', '09:30']);
          expect(request.body.end).to.be.oneOf(['09:00', '18:00', '18:30']);
          response.json(request.body);

          done();
          next();

          app._router.stack.length -= 3;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };

        bot.inject('message', {
          text: `schedules set ${bot.users[0].name}
                 saturday > 8:30 - 9:00, 10:00 - 18:00
                 sunday > 9:30 - 18:30`,
          mention: true,
          user: bot.users[0].id
        });
      });
    });
  });

  after(cleanup);
});
