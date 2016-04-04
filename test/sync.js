import express from 'express';
import { expect } from 'chai';
import _ from 'lodash';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import bolt from 'slack-bolt';
import sync from '../build/sync-users';

const LONG_DELAY = 3000;

describe('sync users', function main() {
  this.timeout(LONG_DELAY);
  let server;
  let bot;
  let ws;
  let app;
  let uri;
  before(done => {
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

    bot.on('ready', done);
  });

  it('should create employee if it doesn\'t exist', async () => {
    const user = {
      name: 'someone',
      is_bot: false,
      profile: {
        first_name: 'Mr',
        last_name: 'Test',
        email: 'test@test.com',
        phone: '919999999'
      }
    };

    bot.users = [user];

    app.get('/employee', (request, response, next) => {
      expect(request.query.username).to.equal(user.name);

      response.json();
      next();
    });

    app.post('/employee', (request, response, next) => {
      expect(request.body.username).to.equal(user.name);
      expect(request.body.email).to.equal(user.profile.email);
      expect(request.body.firstname).to.equal(user.profile.first_name);
      expect(request.body.lastname).to.equal(user.profile.last_name);
      expect(request.body.phone).to.equal(user.profile.phone);

      response.json(request.body);
      next();
    });

    const stats = await sync(bot, uri);
    expect(stats.created).to.equal(1);

    app._router.stack.length -= 2;
  });

  it('should remove employee if user is deleted from slack', async () => {
    const user = {
      name: 'someone',
      is_bot: false,
      deleted: true,
      profile: {
        first_name: 'Mr',
        last_name: 'Test',
        email: 'test@test.com',
        phone: '919999999'
      }
    };

    bot.users = [user];

    app.get('/employee', (request, response, next) => {
      expect(request.query.username).to.equal(user.name);

      response.json({
        username: user.name,
        firstname: user.profile.first_name,
        lastname: user.profile.last_name,
        email: user.profile.email,
        phone: user.profile.phone
      });
      next();
    });

    app.delete('/employee', (request, response, next) => {
      expect(request.query.username).to.equal(user.name);

      response.json(request.query);
      next();
    });

    const stats = await sync(bot, uri);
    expect(stats.deleted).to.equal(1);

    app._router.stack.length -= 2;
  });

  it('should update employee if user is changed from slack', async () => {
    const user = {
      name: 'someone',
      is_bot: false,
      profile: {
        first_name: 'Mr',
        last_name: 'Test',
        email: 'test@test.com',
        phone: '919999999'
      }
    };
    const oldUser = _.cloneDeep(user);

    bot.users = [user];

    app.get('/employee', (request, response, next) => {
      expect(request.query.username).to.equal(user.name);

      response.json({
        username: oldUser.name,
        firstname: oldUser.profile.first_name,
        lastname: oldUser.profile.last_name,
        email: oldUser.profile.email,
        phone: oldUser.profile.phone
      });
      next();
    });

    app.put('/employee/:id', (request, response, next) => {
      expect(request.body.username).to.equal(user.name);
      expect(request.body.email).to.equal(user.profile.email);
      expect(request.body.firstname).to.equal(user.profile.first_name);
      expect(request.body.lastname).to.equal(user.profile.last_name);
      expect(request.body.phone).to.equal(user.profile.phone);

      response.json(request.body);
      next();
    });

    const stats = await sync(bot, uri);
    expect(stats.untouched).to.equal(1);

    user.profile.email = 'something@else.com';
    user.profile.phone += '0';
    user.profile.first_name = 'ok';
    user.profile.last_name = 'ko';

    const stats1 = await sync(bot, uri);
    expect(stats1.updated).to.equal(1);

    app._router.stack.length -= 3;
  });

  after(async () => {
    if (server) server.close();
    if (ws) ws.close();
    await bot.stop();
  });
});
