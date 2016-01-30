'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this2 = this;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _utils = require('../utils');

var _lodash = require('lodash');

var printHours = function printHours(hours) {
  if (!hours.length) {
    return 'Nothing to show 😶';
  }
  var output = ':timer_clock: Your working hours plan is:\n';
  output += hours.map(function (hour, id) {
    return '#' + (id + 1) + '- *' + (0, _lodash.capitalize)(hour.weekday) + '* from *' + hour.start + '* to *' + hour.end + '*';
  }).join('\n');
  return output;
};

exports['default'] = function callee$0$0(bot, uri) {
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/(?:workhours|wh)\s?(\w+)?/i, function callee$1$0(message) {
          var _message$match, method, employee, workHours, today, weekday;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match = _slicedToArray(message.match, 1);
                method = _message$match[0];
                context$2$0.next = 4;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 4:
                employee = context$2$0.sent;
                workHours = undefined;

                if (!(!method || method === 'list')) {
                  context$2$0.next = 11;
                  break;
                }

                context$2$0.next = 9;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/workhours'));

              case 9:
                workHours = context$2$0.sent;

                message.reply(printHours(workHours));

              case 11:
                if (!(method === 'tomorrow')) {
                  context$2$0.next = 18;
                  break;
                }

                today = new Date();
                weekday = (0, _utils.getWeekday)(today.getDay() + 1);
                context$2$0.next = 16;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + ('/workhours?weekday=' + weekday)));

              case 16:
                workHours = context$2$0.sent;

                message.reply(printHours(workHours));

              case 18:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

      case 1:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this2);
};

module.exports = exports['default'];
