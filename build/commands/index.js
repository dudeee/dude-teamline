'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

exports['default'] = function (bot, uri) {
  var commandsDir = './';
  var commandsPath = _path2['default'].join(__dirname, commandsDir);

  var commands = _fs2['default'].readdirSync(commandsPath);
  commands.filter(function (name) {
    return name !== 'index.js';
  }).forEach(function (file) {
    require(commandsPath + '/' + file)(bot, uri);
  });
};

module.exports = exports['default'];
