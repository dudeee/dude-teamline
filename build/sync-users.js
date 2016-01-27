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
                  context$2$0.next = 15;
                  break;
                }

                console.log('creating role');
                context$2$0.next = 12;
                return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/role', null, {
                  name: title
                }));

              case 12:
                role = context$2$0.sent;
                context$2$0.next = 19;
                break;

              case 15:
                console.log('finding employee');
                context$2$0.next = 18;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/role'));

              case 18:
                exists = context$2$0.sent;

              case 19:
                if (exists) {
                  context$2$0.next = 22;
                  break;
                }

                context$2$0.next = 22;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/associate/role/' + role.id + '/employee/' + employee.id));

              case 22:
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
          context$1$0.next = 42;
          break;
        }

        user = _step.value;

        if (!(user.is_bot || user.name === 'slackbot')) {
          context$1$0.next = 11;
          break;
        }

        return context$1$0.abrupt('continue', 39);

      case 11:
        record = {
          username: user.name,
          email: user.profile.email,
          firstname: user.profile.first_name,
          lastname: user.profile.last_name,
          phone: user.profile.phone || null
        };

        console.log(uri + '/employee?username=' + user.name);
        context$1$0.next = 15;
        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee?username=' + user.name));

      case 15:
        employee = context$1$0.sent;

        if (!(employee && user.deleted)) {
          context$1$0.next = 20;
          break;
        }

        stats.deleted++;
        (0, _utils.request)('delete', uri + '/employee/' + employee.id);
        return context$1$0.abrupt('continue', 39);

      case 20:
        if (!(employee && _lodash2['default'].eq(employee, user))) {
          context$1$0.next = 25;
          break;
        }

        stats.untouched++;
        context$1$0.next = 24;
        return regeneratorRuntime.awrap(updateRole(employee, user));

      case 24:
        return context$1$0.abrupt('continue', 39);

      case 25:
        if (!employee) {
          context$1$0.next = 33;
          break;
        }

        stats.updated++;
        context$1$0.next = 29;
        return regeneratorRuntime.awrap((0, _utils.request)('put', uri + '/employee/' + employee.id, null, record));

      case 29:
        employee = context$1$0.sent;
        context$1$0.next = 32;
        return regeneratorRuntime.awrap(updateRole(employee, user));

      case 32:
        return context$1$0.abrupt('continue', 39);

      case 33:

        stats.created++;
        context$1$0.next = 36;
        return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/employee', null, record));

      case 36:
        employee = context$1$0.sent;
        context$1$0.next = 39;
        return regeneratorRuntime.awrap(updateRole(employee, user));

      case 39:
        _iteratorNormalCompletion = true;
        context$1$0.next = 7;
        break;

      case 42:
        context$1$0.next = 48;
        break;

      case 44:
        context$1$0.prev = 44;
        context$1$0.t0 = context$1$0['catch'](5);
        _didIteratorError = true;
        _iteratorError = context$1$0.t0;

      case 48:
        context$1$0.prev = 48;
        context$1$0.prev = 49;

        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }

      case 51:
        context$1$0.prev = 51;

        if (!_didIteratorError) {
          context$1$0.next = 54;
          break;
        }

        throw _iteratorError;

      case 54:
        return context$1$0.finish(51);

      case 55:
        return context$1$0.finish(48);

      case 56:
        return context$1$0.abrupt('return', stats);

      case 57:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this, [[5, 44, 48, 56], [49,, 51, 55]]);
};

module.exports = exports['default'];
