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
    return 'Oops! I got nothing to show! 😶';
  }
  var output = hours.length > 1 ? ':timer_clock: Your working hours plan is:\n' : ':timer_clock: Your working hours plan for *' + hours[0].weekday + '* is:\n';
  output += hours.map(function (hour, id) {
    return '#' + (id + 1) + '- *' + (0, _lodash.capitalize)(hour.weekday) + '* from ' + (0, _utils.getClockEmoji)(hour.start) + (' *' + hour.start + '* to ' + (0, _utils.getClockEmoji)(hour.end) + ' *' + hour.end + '*');
  }).join('\n');
  return output;
};

exports['default'] = function callee$0$0(bot, uri) {
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/(?:workhours?|wh)\s?(\w+)?/i, function callee$1$0(message) {
          var _message$match, time, employee, workHours, today, weekday, weekdays;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match = _slicedToArray(message.match, 1);
                time = _message$match[0];
                context$2$0.next = 4;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 4:
                employee = context$2$0.sent;
                workHours = undefined;

                if (!(time === 'tomorrow')) {
                  context$2$0.next = 13;
                  break;
                }

                today = new Date();
                weekday = (0, _utils.getWeekday)(today.getDay() + 1);
                context$2$0.next = 11;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + ('/workhours?weekday=' + weekday)));

              case 11:
                workHours = context$2$0.sent;
                return context$2$0.abrupt('return', message.reply(printHours(workHours)));

              case 13:
                weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

                if (!weekdays.includes(time)) {
                  context$2$0.next = 19;
                  break;
                }

                context$2$0.next = 17;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + ('/workhours?weekday=' + time)));

              case 17:
                workHours = context$2$0.sent;
                return context$2$0.abrupt('return', message.reply(printHours(workHours)));

              case 19:
                context$2$0.next = 21;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/workhours'));

              case 21:
                workHours = context$2$0.sent;

                message.reply(printHours(workHours));

              case 23:
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
