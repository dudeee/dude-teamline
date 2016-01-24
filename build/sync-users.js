'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

exports['default'] = function sync(bot, uri) {
  var stats;
  return regeneratorRuntime.async(function sync$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        stats = {
          created: 0,
          updated: 0,
          deleted: 0,
          untouched: 0
        };
        context$1$0.next = 3;
        return regeneratorRuntime.awrap(Promise.all(bot.users.map(function callee$1$0(user) {
          var record, employee;
          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                if (!(user.is_bot || user.name === 'slackbot')) {
                  context$2$0.next = 2;
                  break;
                }

                return context$2$0.abrupt('return', true);

              case 2:
                record = {
                  username: user.name,
                  email: user.profile.email,
                  firstname: user.profile.first_name,
                  lastname: user.profile.last_name,
                  phone: user.profile.phone || null
                };
                context$2$0.next = 5;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee?username=' + user.name));

              case 5:
                employee = context$2$0.sent;

                if (!(employee && user.deleted)) {
                  context$2$0.next = 9;
                  break;
                }

                stats.deleted++;
                return context$2$0.abrupt('return', (0, _utils.request)('delete', uri + '/employee/' + employee.id));

              case 9:
                if (!(employee && _lodash2['default'].eq(employee, user))) {
                  context$2$0.next = 12;
                  break;
                }

                stats.untouched++;
                return context$2$0.abrupt('return', true);

              case 12:
                if (!employee) {
                  context$2$0.next = 15;
                  break;
                }

                stats.updated++;
                return context$2$0.abrupt('return', (0, _utils.request)('put', uri + '/employee/' + employee.id, null, record));

              case 15:

                stats.created++;
                return context$2$0.abrupt('return', (0, _utils.request)('post', uri + '/employee', null, record));

              case 17:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        })));

      case 3:
        return context$1$0.abrupt('return', stats);

      case 4:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
};

module.exports = exports['default'];
