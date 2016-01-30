'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this2 = this;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _utils = require('../utils');

exports['default'] = function callee$0$0(bot, uri) {
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/teamline manage add (\w+) (.*)/i, function callee$1$0(message) {
          var _message$match, type, name, t, item;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match = _slicedToArray(message.match, 2);
                type = _message$match[0];
                name = _message$match[1];
                t = type.toLowerCase();
                context$2$0.next = 6;
                return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/' + t, null, { name: name }));

              case 6:
                item = context$2$0.sent;

                message.reply('Created ' + t + ' #' + item.id + ' - ' + item.name);

              case 8:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        }, {
          permissions: ['admin', 'human-resource']
        });

        bot.listen(/teamline manage done (\w+) (?:#)?(\d+)/i, function callee$1$0(message) {
          var _message$match2, type, id, t, item;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match2 = _slicedToArray(message.match, 2);
                type = _message$match2[0];
                id = _message$match2[1];
                t = type.toLowerCase();
                context$2$0.next = 6;
                return regeneratorRuntime.awrap((0, _utils.request)('put', uri + '/' + t + '/' + id, null, {
                  done: true
                }));

              case 6:
                item = context$2$0.sent;

                message.reply('Marked ' + type + ' #' + item.id + ' as done.');

              case 8:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        }, {
          permissions: ['admin', 'human-resource']
        });

        bot.listen(/teamline manage undone (\w+) (?:#)?(\d+)/i, function callee$1$0(message) {
          var _message$match3, type, id, t, item;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match3 = _slicedToArray(message.match, 2);
                type = _message$match3[0];
                id = _message$match3[1];
                t = type.toLowerCase();
                context$2$0.next = 6;
                return regeneratorRuntime.awrap((0, _utils.request)('put', uri + '/' + t + '/' + id, null, {
                  done: false
                }));

              case 6:
                item = context$2$0.sent;

                message.reply('Marked ' + type + ' #' + item.id + ' as undone.');

              case 8:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        }, {
          permissions: ['admin', 'human-resource']
        });

        bot.listen(/teamline manage delete (\w+) (?:#)?(\d+)/i, function callee$1$0(message) {
          var _message$match4, type, id, t, item;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match4 = _slicedToArray(message.match, 2);
                type = _message$match4[0];
                id = _message$match4[1];
                t = type.toLowerCase();
                context$2$0.next = 6;
                return regeneratorRuntime.awrap((0, _utils.request)('delete', uri + '/' + t + '/' + id));

              case 6:
                item = context$2$0.sent;

                message.reply('Deleted ' + type + ' #' + item.id + '.');

              case 8:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        }, {
          permissions: ['admin', 'human-resource']
        });

        bot.listen(/teamline manage connect (\w+) (?:#)?(\d+) (?:with|to|->)?\s?(\w+) (?:#)?(\d+)/i, function callee$1$0(message) {
          var _message$match5, st, sourceId, tt, targetId, sourceType, targetType;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match5 = _slicedToArray(message.match, 4);
                st = _message$match5[0];
                sourceId = _message$match5[1];
                tt = _message$match5[2];
                targetId = _message$match5[3];
                sourceType = st.toLowerCase();
                targetType = tt.toLowerCase();
                context$2$0.next = 9;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/associate/' + sourceType + '/' + sourceId + '/' + targetType + '/' + targetId));

              case 9:

                message.reply('Connected ' + sourceType + ' #' + sourceId + ' with ' + targetType + ' #' + targetId);

              case 10:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        }, {
          permissions: ['admin', 'human-resource']
        });

      case 5:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this2);
};

module.exports = exports['default'];
// eslint-disable-line
