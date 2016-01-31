'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this2 = this;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _dateJs = require('date.js');

var _dateJs2 = _interopRequireDefault(_dateJs);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';
var printRecesses = function printRecesses(recesses) {
  if (!recesses.length) {
    return 'Oops! I got nothing to show! 😶';
  }
  var output = ':umbrella_on_ground: Your recesses list:\n\n';
  output += recesses.map(function (recess, id) {
    var startMoment = (0, _moment2['default'])(new Date(recess.start));
    var endMoment = (0, _moment2['default'])(new Date(recess.end));
    return '#' + (id + 1) + ' - ' + ('for *' + _moment2['default'].duration(startMoment.diff(endMoment)).humanize() + '* ') + ('from *' + startMoment.format(DATE_FORMAT) + '* ') + ('to *' + endMoment.format(DATE_FORMAT) + '*\n') + ('Status: *' + (0, _lodash.capitalize)(recess.status) + '*\n');
  }).join('\n');
  return output;
};

exports['default'] = function callee$0$0(bot, uri) {
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/(?:recess|break)\s(?:(.+)(?:-|_|,))?(.+)(?:to|for|-|_|\.)(.*)/i, function callee$1$0(message) {
          var _message$match, reason, start, end, employee, startDate, endDate, startMoment, endMoment;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match = _slicedToArray(message.match, 3);
                reason = _message$match[0];
                start = _message$match[1];
                end = _message$match[2];
                context$2$0.next = 6;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 6:
                employee = context$2$0.sent;
                startDate = (0, _dateJs2['default'])(start);
                endDate = (0, _dateJs2['default'])(end, startDate);
                context$2$0.next = 11;
                return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/employee/' + employee.id + '/recess', null, {
                  name: reason ? reason.trim() : 'no reason',
                  start: startDate.toString(),
                  end: endDate.toString()
                }));

              case 11:
                startMoment = (0, _moment2['default'])(startDate);
                endMoment = (0, _moment2['default'])(endDate);

                message.reply('Your recess request for ' + ('*' + _moment2['default'].duration(startMoment.diff(endMoment)).humanize() + '* ') + ('from *' + startMoment.format(DATE_FORMAT) + '* ') + ('to *' + endMoment.format(DATE_FORMAT) + '* ') + 'has been submitted.\nI\'ll inform you about the result as soon as I get it. :speaker::+1:');

              case 14:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        bot.listen(/^(?:recess|recesses)$/i, function callee$1$0(message) {
          var employee, recesses;
          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 2:
                employee = context$2$0.sent;
                context$2$0.next = 5;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/recesses'));

              case 5:
                recesses = context$2$0.sent;

                message.reply(printRecesses(recesses));

              case 7:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

      case 2:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this2);
};

module.exports = exports['default'];

// const [start, end] = message.match;

// set offset (second param) to start date
