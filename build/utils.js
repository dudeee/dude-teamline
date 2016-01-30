'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this = this;

exports.request = request;
exports.factoriadic = factoriadic;
exports.factorial = factorial;
exports.permutations = permutations;
exports.fuzzy = fuzzy;
exports.wait = wait;
exports.getWeekday = getWeekday;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _unirest = require('unirest');

var _unirest2 = _interopRequireDefault(_unirest);

function request() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return regeneratorRuntime.async(function request$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        return context$1$0.abrupt('return', new Promise(function (resolve, reject) {
          _unirest2['default'].apply(undefined, args).end(function (response) {
            if (response.error) reject(response.error);

            resolve(response.body);
          });
        }));

      case 1:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
}

var printList = function printList(list) {
  var empty = arguments.length <= 1 || arguments[1] === undefined ? 'Nothing to show 😶' : arguments[1];

  if (!list.length) return empty;

  list = list.sort(function (a, b) {
    return a.id - b.id;
  });

  return list.map(function (item, index) {
    // let mark = typeof item.done === 'undefined' ? '' :
    //                   item.done ? '✅' : '❎';
    var name = item.name || item.firstname + ' ' + item.lastname;
    if (item.Project) {
      return index + 1 + '. *' + item.Project.name + '* > ' + name;
    }

    return '#' + item.id + ' – ' + name;
  }).join('\n');
};

exports.printList = printList;
var findEmployee = function findEmployee(uri, bot, message) {
  var username, employee;
  return regeneratorRuntime.async(function findEmployee$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        username = bot.find(message.user).name;
        context$1$0.next = 3;
        return regeneratorRuntime.awrap(request('get', uri + '/employee?username=' + username));

      case 3:
        employee = context$1$0.sent;

        if (employee) {
          context$1$0.next = 6;
          break;
        }

        return context$1$0.abrupt('return', message.reply('You are not a registered employee'));

      case 6:
        return context$1$0.abrupt('return', employee);

      case 7:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this);
};

exports.findEmployee = findEmployee;
function jaro(a, b) {
  var matchingDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;

  var m = 0;
  var t = 0;
  for (var i = 0; i < a.length; i++) {
    if (a[i] === b[i]) {
      m++;
      continue;
    }

    var min = Math.max(0, i - matchingDistance);
    var max = i + matchingDistance + 1;

    var range = b.slice(min, max);

    if (range.indexOf(a[i]) > -1) {
      m++;
      t++;
    }
  }

  t /= 2;

  return 1 / 3 * (m / a.length + m / b.length + (m - t) / m) || 0;
}

function factoriadic(n, length) {
  var fd = [];
  var last = n;
  for (var i = 1;; i++) {
    fd.unshift(last % i);
    last = Math.floor(last / i);
    if (last <= 0) break;
  }

  if (fd.length < length) {
    var i = length - fd.length;

    fd = new Array(i).fill(0).concat(fd);
  }

  return fd;
}

function factorial(n) {
  var total = 1;
  for (var i = 1; i <= n; i++) {
    total *= i;
  }

  return total;
}

function permutations(arr) {
  var n = arr.length;
  var b = factorial(n);

  var ps = [];

  for (var i = 0; i < b; i++) {
    var fd = factoriadic(i, n);
    var from = arr.slice(0);
    var record = [];

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = fd[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var j = _step.value;

        j = j || 0;
        record.push(from[j]);
        from.splice(j, 1);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    ps.push(record);
  }

  return ps;
}

var BEST_DISTANCE = 1;

function fuzzy(string, list) {
  string = string.toLowerCase();
  list = list.map(function (a) {
    return a.toLowerCase();
  });

  var words = string.split(' ');
  var ps = permutations(words);

  var _loop = function (i) {
    var item = list[i];

    if (string === item) return {
        v: [BEST_DISTANCE, i]
      };

    var index = ps.findIndex(function (p) {
      return p.join(' ') === item;
    });
    if (index > -1) return {
        v: [BEST_DISTANCE, i]
      };
  };

  for (var i = 0; i < list.length; i++) {
    var _ret = _loop(i);

    if (typeof _ret === 'object') return _ret.v;
  }

  var distance = list.map(function (item) {
    var args = item.length < string.length ? [item, string] : [string, item];
    return jaro.apply(undefined, args);
  });

  var max = Math.max.apply(Math, _toConsumableArray(distance));
  var closest = distance.indexOf(max);

  return [max, closest];
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Get weekday name by it's id
 * @param  {number} id weekday id (originally, 0 to 6)
 * @return {string} weekday name
 */

function getWeekday(id) {
  var weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return weekdays[id % 7];
}
