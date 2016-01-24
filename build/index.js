'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

<<<<<<< HEAD
var _this3 = this;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _teamline = require('teamline');

var _teamline2 = _interopRequireDefault(_teamline);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _unirest = require('unirest');

var _unirest2 = _interopRequireDefault(_unirest);

var _utils = require('./utils');

var _syncUsers = require('./sync-users');

var _syncUsers2 = _interopRequireDefault(_syncUsers);

var _commands = require('./commands');

var _commands2 = _interopRequireDefault(_commands);

var _management = require('./management');

var _management2 = _interopRequireDefault(_management);

exports['default'] = function callee$0$0(bot) {
  var numbers, server, uri, job, stats;
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this2 = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        numbers = bot.utils.numbers;
        context$1$0.next = 3;
        return regeneratorRuntime.awrap((0, _teamline2['default'])(bot.config.teamline));

      case 3:
        server = context$1$0.sent;
        uri = server.info.uri + bot.config.teamline.crud.prefix || '/';

        (0, _commands2['default'])(bot, uri);
        (0, _management2['default'])(bot, uri);

        bot.agenda.define('ask-for-tasks', function callee$1$0(job, done) {
          var users;
          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            var _this = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                users = bot.users;
                context$2$0.next = 3;
                return regeneratorRuntime.awrap(Promise.all(users.map(function callee$2$0(user) {
                  var employee, undone;
                  return regeneratorRuntime.async(function callee$2$0$(context$3$0) {
                    while (1) switch (context$3$0.prev = context$3$0.next) {
                      case 0:
                        context$3$0.next = 2;
                        return regeneratorRuntime.awrap(findEmployee(uri, bot, { user: user }));

                      case 2:
                        employee = context$3$0.sent;
                        context$3$0.next = 5;
                        return regeneratorRuntime.awrap((0, _utils.request)(uri + '/employee/' + employee.id + '/actions/undone'));

                      case 5:
                        undone = context$3$0.sent;

                        if (undone.length) {
                          bot.sendMessage(user.name, 'What are you going to do today? 😃\nAlso, you have ' + undone.length + ' actions left from yesterday, too, might want to check them out.');
                        } else {
                          bot.sendMessage(user.name, 'Hey! What are you going to do today? 😃');
                        }

                      case 7:
                      case 'end':
                        return context$3$0.stop();
                    }
                  }, null, _this);
                })));

              case 3:

                done();

              case 4:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this2);
        });

        job = bot.agenda.create('ask-for-tasks');

        job.repeatAt('8:30am');
        job.save();

        /*
        teamline add \`(project)\` \`task\` – add a new action for the corresponding project
        teamline done \`id\` – mark task #id as done
        teamline undone \`id\` – mark task #id as undone
        teamline manage done \`type\` \`id\` – mark the object of \`type\` with \`id\` as done
        teamline manage undone \`type\` \`id\` – mark the object of \`type\` with \`id\` as undone
        */

        // add a help record for your plugin's commands
        bot.help('teamline', 'Manage teamline', '\nteamline todo – view your tasks for today\nteamline todo [project] > [action] – set your actions for today, separate actions by line breaks\nteamline my projects/roles/actions/teams – list models associated with you\nteamline all projects/roles/actions/teams/goals/okrs – list all models\n\nManagers have access to these commands\nteamline manage add `type` `name` – add a new object of `type` with the specified `name`\nteamline manage delete `type` `id` – delete the object of `type` with `id`\nteamline manage connect `type` `id` with `type` `id` – connect two models with each other\nExample: teamline manage connect role 1 with employee 2\n\n`type` is one of the following: okr, goal, project, team, role, company, employee\n\n*Scopes* are filters which help you find the items you want, some examples include:\ndone, undone, past (action), future (action), today (action)\n');

        context$1$0.next = 14;
        return regeneratorRuntime.awrap((0, _syncUsers2['default'])(bot, uri));

      case 14:
        stats = context$1$0.sent;

        bot.log.verbose('[teamline] Synced Teamline Users with Slack\nCreated: ' + stats.created + '\nUpdated: ' + stats.updated + '\nDeleted: ' + stats.deleted + '\nUntouched: ' + stats.untouched);

      case 16:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this3);
=======
exports['default'] = function (bot) {
  // read configurations from bot.config, users set bot.config in `config.js`
  var config = bot.config.template;

  // Add a help record for your plugin's commands
  // When the user issues `help`, there will be a list of command names along
  // with their short description (second argument).
  // If the user issues `help` with a command name, like `help example`,
  // the long description (last argument) will be shown.
  bot.help('example', 'shows an example', 'example <name>');
>>>>>>> 315007bd2ed6cde977cf9282ca85a1b2a696ad08
};

module.exports = exports['default'];
