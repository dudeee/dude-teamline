'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this4 = this;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

exports['default'] = function callee$0$0(bot, uri) {
  var listTodos, MIN_SIMILARITY, setTodos, updateListener;
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/teamline my (\w+)\s?(\w+)?/i, function callee$1$0(message) {
          var _message$match, type, scope, employee, items, roles;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match = _slicedToArray(message.match, 2);
                type = _message$match[0];
                scope = _message$match[1];

                type = type.toLowerCase();
                scope = scope || '';

                context$2$0.next = 7;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 7:
                employee = context$2$0.sent;
                items = undefined;

                if (!(type === 'actions' || type === 'roles')) {
                  context$2$0.next = 13;
                  break;
                }

                context$2$0.next = 12;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/' + type + '/' + scope));

              case 12:
                items = context$2$0.sent;

              case 13:
                if (!(type === 'projects' || type === 'teams')) {
                  context$2$0.next = 26;
                  break;
                }

                context$2$0.next = 16;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/roles'));

              case 16:
                roles = context$2$0.sent;

                if (!(type === 'projects')) {
                  context$2$0.next = 21;
                  break;
                }

                context$2$0.next = 20;
                return regeneratorRuntime.awrap(Promise.all(roles.map(function (role) {
                  return (0, _utils.request)('get', uri + '/role/' + role.id + '/project/' + scope);
                })));

              case 20:
                items = context$2$0.sent;

              case 21:
                if (!(type === 'teams')) {
                  context$2$0.next = 25;
                  break;
                }

                context$2$0.next = 24;
                return regeneratorRuntime.awrap(Promise.all(roles.map(function (role) {
                  return (0, _utils.request)('get', uri + '/role/' + role.id + '/team');
                })));

              case 24:
                items = context$2$0.sent;

              case 25:

                items = _lodash2['default'].flatten(items);

              case 26:

                message.reply((0, _utils.printList)(items));

              case 27:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        bot.listen(/teamline all (\w+)\s?(\w+)?/i, function callee$1$0(message) {
          var _message$match2, type, scope, list;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match2 = _slicedToArray(message.match, 2);
                type = _message$match2[0];
                scope = _message$match2[1];

                type = type.toLowerCase();
                scope = scope || '';

                context$2$0.next = 7;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/' + type + '/' + scope));

              case 7:
                list = context$2$0.sent;

                message.reply((0, _utils.printList)(list));

              case 9:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        listTodos = function listTodos(message) {
          var employee, actions, congrats, reply;
          return regeneratorRuntime.async(function listTodos$(context$2$0) {
            var _this2 = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 2:
                employee = context$2$0.sent;
                context$2$0.next = 5;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/actions/today'));

              case 5:
                actions = context$2$0.sent;

                if (actions.length) {
                  context$2$0.next = 10;
                  break;
                }

                congrats = bot.random('Your todo list is empty! ✌️', 'Woohoo! Your todo list is empty! 🎈', 'You know what? You\'re amazing! Your list is empty! 😎', 'Surprise! Nothing to do! ⛱');

                message.reply(congrats);
                return context$2$0.abrupt('return');

              case 10:
                context$2$0.next = 12;
                return regeneratorRuntime.awrap(Promise.all(actions.map(function callee$2$0(action) {
                  var project;
                  return regeneratorRuntime.async(function callee$2$0$(context$3$0) {
                    while (1) switch (context$3$0.prev = context$3$0.next) {
                      case 0:
                        context$3$0.next = 2;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/action/' + action.id + '/project'));

                      case 2:
                        project = context$3$0.sent;

                        if (!(!project || !action)) {
                          context$3$0.next = 5;
                          break;
                        }

                        return context$3$0.abrupt('return', Promise.resolve());

                      case 5:
                        return context$3$0.abrupt('return', project.name + ' > ' + action.name);

                      case 6:
                      case 'end':
                        return context$3$0.stop();
                    }
                  }, null, _this2);
                })));

              case 12:
                reply = context$2$0.sent;

                reply = reply.filter(function (a) {
                  return a;
                });

                message.reply(reply.join('\n'));

              case 15:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        };

        MIN_SIMILARITY = 0.3;

        setTodos = function setTodos(message, update) {
          var projects, projectNames, _message$match3, cmd, actions, employee, submitted, reply;

          return regeneratorRuntime.async(function setTodos$(context$2$0) {
            var _this3 = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/projects'));

              case 2:
                projects = context$2$0.sent;
                projectNames = projects.map(function (project) {
                  return project.name;
                });
                _message$match3 = _slicedToArray(message.match, 1);
                cmd = _message$match3[0];
                actions = message.text.slice(cmd.length + message.text.indexOf(cmd)).split('\n').filter(function (a) {
                  return a;
                }) // filter out empty lines
                .map(function (a) {
                  return a.split('&gt;');
                }).map(function (_ref) {
                  var _ref2 = _slicedToArray(_ref, 2);

                  var project = _ref2[0];
                  var action = _ref2[1];
                  return [project.trim(), action.trim()];
                }).filter(function (_ref3) {
                  var _ref32 = _slicedToArray(_ref3, 2);

                  var project = _ref32[0];
                  var action = _ref32[1];
                  return project && action;
                })
                // Find the most similar project name available, we don't want to bug the user
                .map(function (_ref4) {
                  var _ref42 = _slicedToArray(_ref4, 2);

                  var project = _ref42[0];
                  var action = _ref42[1];

                  var _fuzzy = (0, _utils.fuzzy)(project, projectNames);

                  var _fuzzy2 = _slicedToArray(_fuzzy, 2);

                  var distance = _fuzzy2[0];
                  var index = _fuzzy2[1];

                  if (distance > MIN_SIMILARITY) return [projectNames[index], action];

                  return [null, action];
                });

                if (actions.length) {
                  context$2$0.next = 10;
                  break;
                }

                listTodos(message);
                return context$2$0.abrupt('return');

              case 10:
                context$2$0.next = 12;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 12:
                employee = context$2$0.sent;
                context$2$0.next = 15;
                return regeneratorRuntime.awrap((0, _utils.request)('delete', uri + '/employee/' + employee.id + '/actions'));

              case 15:
                context$2$0.next = 17;
                return regeneratorRuntime.awrap(Promise.all(actions.map(function callee$2$0(_ref5) {
                  var _ref52 = _slicedToArray(_ref5, 2);

                  var project = _ref52[0];
                  var action = _ref52[1];

                  var ac, pr, employeeRoles, projectRoles, roles, roleNames, user, _ref6, _ref62, index, id;

                  return regeneratorRuntime.async(function callee$2$0$(context$3$0) {
                    while (1) switch (context$3$0.prev = context$3$0.next) {
                      case 0:
                        if (project) {
                          context$3$0.next = 3;
                          break;
                        }

                        message.reply('I\'m sorry, but I couldn\'t find any project called ' + project + '.');
                        return context$3$0.abrupt('return', Promise.resolve());

                      case 3:
                        context$3$0.next = 5;
                        return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/employee/' + employee.id + '/action', null, { name: action }));

                      case 5:
                        ac = context$3$0.sent;
                        context$3$0.next = 8;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/project?name=' + project));

                      case 8:
                        pr = context$3$0.sent;
                        context$3$0.next = 11;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/associate/action/' + ac.id + '/project/' + pr.id));

                      case 11:
                        context$3$0.next = 13;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/roles'));

                      case 13:
                        employeeRoles = context$3$0.sent;
                        context$3$0.next = 16;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/project/' + pr.id + '/roles'));

                      case 16:
                        projectRoles = context$3$0.sent;
                        roles = _lodash2['default'].intersectionBy(employeeRoles, projectRoles, 'id');

                        if (roles.length) {
                          context$3$0.next = 29;
                          break;
                        }

                        roleNames = projectRoles.map(function (p) {
                          return p.name;
                        });
                        user = bot.find(message.user);
                        context$3$0.next = 23;
                        return regeneratorRuntime.awrap(bot.ask(user.name, 'What\'s your role in project *' + pr.name + '*?', roleNames));

                      case 23:
                        _ref6 = context$3$0.sent;
                        _ref62 = _slicedToArray(_ref6, 1);
                        index = _ref62[0];
                        id = projectRoles[index].id;
                        context$3$0.next = 29;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/associate/role/' + id + '/employee/' + employee.id));

                      case 29:
                        return context$3$0.abrupt('return', ac);

                      case 30:
                      case 'end':
                        return context$3$0.stop();
                    }
                  }, null, _this3);
                })));

              case 17:
                submitted = context$2$0.sent;

                if (!update) {
                  context$2$0.next = 20;
                  break;
                }

                return context$2$0.abrupt('return');

              case 20:

                message.on('update', updateListener.bind(null, submitted));

                reply = bot.random('Thank you! 🙏', 'Good luck! ✌️', 'Thanks, have a nice day! 👍');

                message.reply(reply);

              case 23:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        };

        updateListener = function updateListener(submitted, message) {
          return regeneratorRuntime.async(function updateListener$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap(Promise.all(submitted.map(function (action) {
                  if (!action) return Promise.resolve();

                  return (0, _utils.request)('delete', uri + '/action/' + action.id);
                })));

              case 2:

                message.match = /(teamline todo(?:s?))/i.exec(message.text);
                setTodos(message, true);

              case 4:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        };

        bot.listen(/(teamline todo(?:s?))/i, setTodos);

        // bot.listen(/teamline done (?:#)?(\d+)/i, async message => {
        //   let [id] = message.match;
        //
        //   let employee = await findEmployee(uri, bot, message);
        //
        //   let action = await request('put', `${uri}/employee/${employee.id}/action/${id}`, null, {
        //     done: true
        //   });
        //
        //   const congrats = bot.random('Good job! 👍', 'Thank you! 🙏', 'Unto the next! ✊');
        //   message.reply(`Marked #${action.id} as done. ${congrats}`);
        // });
        //
        // bot.listen(/teamline undone (?:#)?(\d+)/i, async message => {
        //   let [id] = message.match;
        //
        //   let employee = await findEmployee(uri, bot, message);
        //
        //   let action = await request('put', `${uri}/employee/${employee.id}/action/${id}`, null, {
        //     done: false
        //   });
        //
        //   const again = bot.random('There\'s still time!', 'Maybe later.', 'Wanna take a break?');
        //   message.reply(`Marked #${action.id} as undone.`);
        // });

      case 7:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this4);
};

module.exports = exports['default'];
