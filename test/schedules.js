import express from 'express';
import { expect } from 'chai';
import bolt from 'slack-bolt';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import commands from '../build/commands/index';
import { slack, teamline } from './fixtures';

const LONG_DELAY = 10000;

describe('schedules', function functions() {
  this.timeout(LONG_DELAY);

  let server;
  let bot;
  let ws;
  let app;
  let uri;
  before(done => {
    if (server) server.close();
    if (ws) ws.close();

    ws = new WebSocket.Server({ port: 9090 });
    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    server = app.listen(9091);

    bot = bolt({
      log: {
        level: 'silly'
      },
      teamline: {
        actionsChannel: false,
        teamsChannels: false
      }
    }, true);

    ws._events = {};

    bot.connect('ws://127.0.0.1:9090');
    bot._api = 'http://127.0.0.1:9091/';
    uri = bot._api.slice(0, -1);

    Object.assign(bot, slack);

    app.get('/employee', (request, response, next) => {
      response.json(teamline.users[0]);
      next();
    });

    bot.on('ready', () => {
      commands(bot, uri);
      done();
    });
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

  after(async () => {
    if (server) server.close();
    if (ws) ws.close();
    await bot.stop();
  });
});
