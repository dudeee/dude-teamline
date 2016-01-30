'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this2 = this;

var _utils = require('../utils');

exports['default'] = function callee$0$0(bot, uri) {
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/recess\s?(\w+)?/i, function callee$1$0(message) {
          var recesses;
          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/1/workhours'));

              case 2:
                recesses = context$2$0.sent;

                message.reply((0, _utils.printList)(recesses));

              case 4:
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

// const [type] = message.match;
// const employee = await findEmployee(uri, bot, message);
