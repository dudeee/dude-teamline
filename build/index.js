'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this3 = this;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _teamline = require('teamline');

var _teamline2 = _interopRequireDefault(_teamline);

var _utils = require('./utils');

var _syncUsers = require('./sync-users');

var _syncUsers2 = _interopRequireDefault(_syncUsers);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _commands = require('./commands');

var _commands2 = _interopRequireDefault(_commands);

var timezone = 'Asia/Tehran';

exports['default'] = function callee$0$0(bot) {
  var server, uri, job, publishJob, stats;
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        context$1$0.next = 2;
        return regeneratorRuntime.awrap((0, _teamline2['default'])(bot.config.teamline));

      case 2:
        server = context$1$0.sent;
        uri = server.info.uri + (_lodash2['default'].get(bot, 'config.teamline.crud.prefix') || '');

        try {
          (0, _commands2['default'])(bot, uri);
        } catch (e) {
          bot.log.error(e);
        }

        bot.agenda.define('ask-for-actions', function callee$1$0(job, done) {
          var d, users, RATE_LIMIT, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, user, emp, a;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                d = new Date();

                if (!(d.getHours() !== 9)) {
                  context$2$0.next = 3;
                  break;
                }

                return context$2$0.abrupt('return');

              case 3:
                users = bot.users;
                RATE_LIMIT = 1000;
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                context$2$0.prev = 8;
                _iterator = users[Symbol.iterator]();

              case 10:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  context$2$0.next = 26;
                  break;
                }

                user = _step.value;
                context$2$0.next = 14;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee?username=' + user.name));

              case 14:
                emp = context$2$0.sent;
                context$2$0.next = 17;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + emp.id + '/actions/today'));

              case 17:
                a = context$2$0.sent;

                if (!a.length) {
                  context$2$0.next = 20;
                  break;
                }

                return context$2$0.abrupt('continue', 23);

              case 20:

                bot.sendMessage(user.id, 'Hey! What are you going to do today? 😃');
                context$2$0.next = 23;
                return regeneratorRuntime.awrap((0, _utils.wait)(RATE_LIMIT));

              case 23:
                _iteratorNormalCompletion = true;
                context$2$0.next = 10;
                break;

              case 26:
                context$2$0.next = 32;
                break;

              case 28:
                context$2$0.prev = 28;
                context$2$0.t0 = context$2$0['catch'](8);
                _didIteratorError = true;
                _iteratorError = context$2$0.t0;

              case 32:
                context$2$0.prev = 32;
                context$2$0.prev = 33;

                if (!_iteratorNormalCompletion && _iterator['return']) {
                  _iterator['return']();
                }

              case 35:
                context$2$0.prev = 35;

                if (!_didIteratorError) {
                  context$2$0.next = 38;
                  break;
                }

                throw _iteratorError;

              case 38:
                return context$2$0.finish(35);

              case 39:
                return context$2$0.finish(32);

              case 40:

                done();

              case 41:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this, [[8, 28, 32, 40], [33,, 35, 39]]);
        });

        bot.agenda.define('publish-actions', function callee$1$0(job, done) {
          var d, users;
          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            var _this2 = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                d = new Date();

                if (!(d.getHours() !== 10)) {
                  context$2$0.next = 3;
                  break;
                }

                return context$2$0.abrupt('return');

              case 3:
                users = bot.users;
                context$2$0.next = 6;
                return regeneratorRuntime.awrap(Promise.all(users.map(function callee$2$0(user) {
                  var employee, name, url, actions, list;
                  return regeneratorRuntime.async(function callee$2$0$(context$3$0) {
                    while (1) switch (context$3$0.prev = context$3$0.next) {
                      case 0:
                        context$3$0.next = 2;
                        return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, { user: user.id }));

                      case 2:
                        employee = context$3$0.sent;
                        name = '@' + employee.username + ' – ' + employee.firstname + ' ' + employee.lastname;
                        url = uri + '/employee/' + employee.id + '/actions/today?include=Project';
                        context$3$0.next = 7;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', url));

                      case 7:
                        actions = context$3$0.sent;

                        if (actions.length) {
                          context$3$0.next = 10;
                          break;
                        }

                        return context$3$0.abrupt('return');

                      case 10:
                        list = (0, _utils.printList)(actions);

                        bot.sendMessage('actions', name + '\n' + list);

                      case 12:
                      case 'end':
                        return context$3$0.stop();
                    }
                  }, null, _this2);
                })));

              case 6:

                done();

              case 7:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        job = bot.agenda.create('ask-for-actions', {
          repeatTimezone: timezone
        });

        job.repeatAt('9:30am');
        job.save();

        publishJob = bot.agenda.create('publish-actions', {
          repeatTimezone: timezone
        });

        publishJob.repeatAt('10:00am');
        publishJob.save();

        /*
        teamline add \`(project)\` \`task\` – add a new action for the corresponding project
        teamline done \`id\` – mark task #id as done
        teamline undone \`id\` – mark task #id as undone
        teamline manage done \`type\` \`id\` – mark the object of \`type\` with \`id\` as done
        teamline manage undone \`type\` \`id\` – mark the object of \`type\` with \`id\` as undone
        */

        // add a help record for your plugin's commands
        bot.help('teamline', 'Manage teamline', '\nteamline todo – view your tasks for today\nteamline todo [project] > [action] – set your actions for today, separate actions by line breaks\nteamline my projects/roles/actions/teams – list models associated with you\nteamline all projects/roles/actions/teams/goals/okrs – list all models\n\nManagers have access to these commands\nteamline manage add `type` `name` – add a new object of `type` with the specified `name`\nteamline manage delete `type` `id` – delete the object of `type` with `id`\nteamline manage connect `type` `id` with `type` `id` – connect two models with each other\nExample: teamline manage connect role 1 with employee 2\n\n`type` is one of the following: okr, goal, project, team, role, company, employee\n\n*Scopes* are filters which help you find the items you want, some examples include:\ndone, undone, past (action), future (action), today (action)\n');

        context$1$0.prev = 14;
        context$1$0.next = 17;
        return regeneratorRuntime.awrap((0, _syncUsers2['default'])(bot, uri));

      case 17:
        stats = context$1$0.sent;

        bot.log.verbose('[teamline] Synced Teamline Users with Slack\nCreated: ' + stats.created + '\nUpdated: ' + stats.updated + '\nDeleted: ' + stats.deleted + '\nUntouched: ' + stats.untouched);
        context$1$0.next = 24;
        break;

      case 21:
        context$1$0.prev = 21;
        context$1$0.t0 = context$1$0['catch'](14);

        bot.log.error(context$1$0.t0);

      case 24:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this3, [[14, 21]]);
};

module.exports = exports['default'];
