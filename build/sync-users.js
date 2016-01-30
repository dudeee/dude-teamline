'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

exports['default'] = function sync(bot, uri) {
  var stats, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, user, record, employee, updateRole;

  return regeneratorRuntime.async(function sync$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        updateRole = function updateRole(employee, user) {
          var roles, title, role, exists;
          return regeneratorRuntime.async(function updateRole$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                if (user.profile.title) {
                  context$2$0.next = 2;
                  break;
                }

                return context$2$0.abrupt('return');

              case 2:
                context$2$0.next = 4;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/roles'));

              case 4:
                roles = context$2$0.sent;
                title = user.profile.title;
                role = roles.find(function (a) {
                  return a.name.toLowerCase() === title.toLowerCase();
                });
                exists = false;

                if (role) {
                  context$2$0.next = 14;
                  break;
                }

                context$2$0.next = 11;
                return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/role', null, {
                  name: title
                }));

              case 11:
                role = context$2$0.sent;
                context$2$0.next = 17;
                break;

              case 14:
                context$2$0.next = 16;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/role'));

              case 16:
                exists = context$2$0.sent;

              case 17:
                if (exists) {
                  context$2$0.next = 20;
                  break;
                }

                context$2$0.next = 20;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/associate/role/' + role.id + '/employee/' + employee.id));

              case 20:
              case 'end':
                return context$2$0.stop();
            }
          }, null, this);
        };

        stats = {
          created: 0,
          updated: 0,
          deleted: 0,
          untouched: 0
        };
        _iteratorNormalCompletion = true;
        _didIteratorError = false;
        _iteratorError = undefined;
        context$1$0.prev = 5;
        _iterator = bot.users[Symbol.iterator]();

      case 7:
        if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
          context$1$0.next = 41;
          break;
        }

        user = _step.value;

        if (!(user.is_bot || user.name === 'slackbot')) {
          context$1$0.next = 11;
          break;
        }

        return context$1$0.abrupt('continue', 38);

      case 11:
        record = {
          username: user.name,
          email: user.profile.email,
          firstname: user.profile.first_name,
          lastname: user.profile.last_name,
          phone: user.profile.phone || null
        };
        context$1$0.next = 14;
        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee?username=' + user.name));

      case 14:
        employee = context$1$0.sent;

        if (!(employee && user.deleted)) {
          context$1$0.next = 19;
          break;
        }

        stats.deleted++;
        (0, _utils.request)('delete', uri + '/employee/' + employee.id);
        return context$1$0.abrupt('continue', 38);

      case 19:
        if (!(employee && _lodash2['default'].eq(employee, user))) {
          context$1$0.next = 24;
          break;
        }

        stats.untouched++;
        context$1$0.next = 23;
        return regeneratorRuntime.awrap(updateRole(employee, user));

      case 23:
        return context$1$0.abrupt('continue', 38);

      case 24:
        if (!employee) {
          context$1$0.next = 32;
          break;
        }

        stats.updated++;
        context$1$0.next = 28;
        return regeneratorRuntime.awrap((0, _utils.request)('put', uri + '/employee/' + employee.id, null, record));

      case 28:
        employee = context$1$0.sent;
        context$1$0.next = 31;
        return regeneratorRuntime.awrap(updateRole(employee, user));

      case 31:
        return context$1$0.abrupt('continue', 38);

      case 32:

        stats.created++;
        context$1$0.next = 35;
        return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/employee', null, record));

      case 35:
        employee = context$1$0.sent;
        context$1$0.next = 38;
        return regeneratorRuntime.awrap(updateRole(employee, user));

      case 38:
        _iteratorNormalCompletion = true;
        context$1$0.next = 7;
        break;

      case 41:
        context$1$0.next = 47;
        break;

      case 43:
        context$1$0.prev = 43;
        context$1$0.t0 = context$1$0['catch'](5);
        _didIteratorError = true;
        _iteratorError = context$1$0.t0;

      case 47:
        context$1$0.prev = 47;
        context$1$0.prev = 48;

        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }

      case 50:
        context$1$0.prev = 50;

        if (!_didIteratorError) {
          context$1$0.next = 53;
          break;
        }

        throw _iteratorError;

      case 53:
        return context$1$0.finish(50);

      case 54:
        return context$1$0.finish(47);

      case 55:
        return context$1$0.abrupt('return', stats);

      case 56:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this, [[5, 43, 47, 55], [48,, 50, 54]]);
};

module.exports = exports['default'];
