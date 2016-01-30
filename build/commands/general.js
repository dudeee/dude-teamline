'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _this3 = this;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

exports['default'] = function callee$0$0(bot, uri) {
  var listTodos, MIN_SIMILARITY, setTodos;
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    var _this = this;

    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        bot.listen(/my (\w+)\s?(\w+)?/i, function callee$1$0(message) {
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
                  context$2$0.next = 14;
                  break;
                }

                scope += '?include=Project';
                context$2$0.next = 13;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/' + type + '/' + scope));

              case 13:
                items = context$2$0.sent;

              case 14:
                if (!(type === 'projects' || type === 'teams')) {
                  context$2$0.next = 27;
                  break;
                }

                context$2$0.next = 17;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/roles'));

              case 17:
                roles = context$2$0.sent;

                if (!(type === 'projects')) {
                  context$2$0.next = 22;
                  break;
                }

                context$2$0.next = 21;
                return regeneratorRuntime.awrap(Promise.all(roles.map(function (role) {
                  return (0, _utils.request)('get', uri + '/role/' + role.id + '/project/' + scope);
                })));

              case 21:
                items = context$2$0.sent;

              case 22:
                if (!(type === 'teams')) {
                  context$2$0.next = 26;
                  break;
                }

                context$2$0.next = 25;
                return regeneratorRuntime.awrap(Promise.all(roles.map(function (role) {
                  return (0, _utils.request)('get', uri + '/role/' + role.id + '/team');
                })));

              case 25:
                items = context$2$0.sent;

              case 26:

                items = _lodash2['default'].flatten(items);

              case 27:

                message.reply((0, _utils.printList)(items));

              case 28:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        bot.listen(/all (\w+)\s?(\w+)?/i, function callee$1$0(message) {
          var _message$match2, type, scope, list;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match2 = _slicedToArray(message.match, 2);
                type = _message$match2[0];
                scope = _message$match2[1];

                type = type.toLowerCase();
                scope = scope || '';

                if (type === 'actions') scope += '?include=Project';
                context$2$0.next = 8;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/' + type + '/' + scope));

              case 8:
                list = context$2$0.sent;

                message.reply((0, _utils.printList)(list));

              case 10:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        listTodos = function listTodos(message) {
          var _message$match3, user, employee, url, actions, placeholder;

          return regeneratorRuntime.async(function listTodos$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match3 = _slicedToArray(message.match, 1);
                user = _message$match3[0];
                context$2$0.next = 4;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, user ? { user: user } : message));

              case 4:
                employee = context$2$0.sent;
                url = uri + '/employee/' + employee.id + '/actions/today?include=Project';
                context$2$0.next = 8;
                return regeneratorRuntime.awrap((0, _utils.request)('get', url));

              case 8:
                actions = context$2$0.sent;
                placeholder = user ? 'His' : 'Your';

                message.reply((0, _utils.printList)(actions, placeholder + ' todo list is empty! 😌'));

              case 11:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        };

        MIN_SIMILARITY = 0.8;

        setTodos = function setTodos(message, update) {
          var projects, projectNames, _message$match4, cmd, actions, employee, url, allActions, list, d, name;

          return regeneratorRuntime.async(function setTodos$(context$2$0) {
            var _this2 = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/projects'));

              case 2:
                projects = context$2$0.sent;
                projectNames = projects.map(function (project) {
                  return project.name;
                });
                _message$match4 = _slicedToArray(message.match, 1);
                cmd = _message$match4[0];
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

                  // last parameter indicates we have to create the project
                  projectNames.push(project);
                  return [project, action, true];
                });
                context$2$0.next = 9;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 9:
                employee = context$2$0.sent;
                context$2$0.next = 12;
                return regeneratorRuntime.awrap(Promise.all(actions.map(function callee$2$0(_ref5) {
                  var _ref52 = _slicedToArray(_ref5, 3);

                  var project = _ref52[0];
                  var action = _ref52[1];
                  var create = _ref52[2];
                  var pr, ac;
                  return regeneratorRuntime.async(function callee$2$0$(context$3$0) {
                    while (1) switch (context$3$0.prev = context$3$0.next) {
                      case 0:
                        pr = undefined;

                        if (!create) {
                          context$3$0.next = 5;
                          break;
                        }

                        context$3$0.next = 4;
                        return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/project', null, {
                          name: project
                        }));

                      case 4:
                        pr = context$3$0.sent;

                      case 5:
                        context$3$0.next = 7;
                        return regeneratorRuntime.awrap((0, _utils.request)('post', uri + '/employee/' + employee.id + '/action', null, { name: action }));

                      case 7:
                        ac = context$3$0.sent;

                        if (pr) {
                          context$3$0.next = 12;
                          break;
                        }

                        context$3$0.next = 11;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/project?name=' + project));

                      case 11:
                        pr = context$3$0.sent;

                      case 12:
                        context$3$0.next = 14;
                        return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/associate/action/' + ac.id + '/project/' + pr.id));

                      case 14:
                        return context$3$0.abrupt('return', ac);

                      case 15:
                      case 'end':
                        return context$3$0.stop();
                    }
                  }, null, _this2);
                })));

              case 12:
                if (!update) {
                  context$2$0.next = 14;
                  break;
                }

                return context$2$0.abrupt('return');

              case 14:
                url = uri + '/employee/' + employee.id + '/actions/today?include=Project';
                context$2$0.next = 17;
                return regeneratorRuntime.awrap((0, _utils.request)('get', url));

              case 17:
                allActions = context$2$0.sent;
                list = (0, _utils.printList)(allActions);

                message.reply(list);

                d = new Date();

                if (!(d.getHours() < 10)) {
                  context$2$0.next = 23;
                  break;
                }

                return context$2$0.abrupt('return');

              case 23:
                name = '@' + employee.username + ' – ' + employee.firstname + ' ' + employee.lastname;

                bot.sendMessage('actions', name + '\n' + list);

              case 25:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        };

        bot.listen(/(?:todo(?:s)?\s?(?:<@)?([^>]*)?>?)$/i, listTodos);

        bot.listen(/todo(?:s)? clear/i, function callee$1$0(message) {
          var employee;
          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 2:
                employee = context$2$0.sent;
                context$2$0.next = 5;
                return regeneratorRuntime.awrap((0, _utils.request)('delete', uri + '/employee/' + employee.id + '/actions/today'));

              case 5:

                message.reply('Cleared your actions for today.');

              case 6:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

        bot.listen(/(todo(?:s)?) (?:.*)>(?:.*)/i, setTodos);

        bot.listen(/todo remove (\d+)/i, function callee$1$0(message) {
          var _message$match5, index, employee, actions, action;

          return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                _message$match5 = _slicedToArray(message.match, 1);
                index = _message$match5[0];

                index = parseInt(index, 10) - 1;

                context$2$0.next = 5;
                return regeneratorRuntime.awrap((0, _utils.findEmployee)(uri, bot, message));

              case 5:
                employee = context$2$0.sent;
                context$2$0.next = 8;
                return regeneratorRuntime.awrap((0, _utils.request)('get', uri + '/employee/' + employee.id + '/actions/today'));

              case 8:
                actions = context$2$0.sent;
                context$2$0.next = 11;
                return regeneratorRuntime.awrap((0, _utils.request)('delete', uri + '/action/' + actions[index].id));

              case 11:
                action = context$2$0.sent;

                message.reply('Removed action "' + action.name + '".');

              case 13:
              case 'end':
                return context$2$0.stop();
            }
          }, null, _this);
        });

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

      case 9:
      case 'end':
        return context$1$0.stop();
    }
  }, null, _this3);
};

module.exports = exports['default'];

// const sentences = ['Your todo list is empty! ✌️',
//                    'Woohoo! Your todo list is empty! 🎈',
//                    'You know what? You\'re amazing! Your list is empty! 😎',
//                    'Surprise! Nothing to do! ⛱'];
// const congrats = bot.random(sentences)

// let reply = await* actions.map(async action => {
//   let project = await request('get', `${uri}/action/${action.id}/project`);
//
//   if (!project || !action) return Promise.resolve();
//
//   return `${project.name} > ${action.name}`;
// });

// reply = reply.filter(a => a);

// let employeeRoles = await request('get', `${uri}/employee/${employee.id}/roles`);
// let projectRoles = await request('get', `${uri}/project/${pr.id}/roles`);
//
// let roles = _.intersectionBy(employeeRoles, projectRoles, 'id');

// if (!roles.length) {
//   let roleNames = projectRoles.map(p => p.name);
//   const user = bot.find(message.user);
//   let [index] = await bot.ask(user.name,
//              `What's your role in project *${pr.name}*?`, roleNames);
//   let { id } = projectRoles[index];
//
//   await request('get', `${uri}/associate/role/${id}/employee/${employee.id}`);
// }

// const reply = bot.random('Thank you! 🙏', 'Good luck! ✌️', 'Thanks, have a nice day! 👍');
// message.reply(reply);
