import { expect } from 'chai';
import _ from 'lodash';
import sync from '../build/sync-users';
import initialize from './initialize';

const LONG_DELAY = 3000;

describe('sync users', function main() {
  this.timeout(LONG_DELAY);

  let bot;
  let app;
  let uri;
  before(async () => {
    const initialized = await initialize();
    bot = initialized.bot;
    app = initialized.app;
    uri = initialized.uri;
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
});
