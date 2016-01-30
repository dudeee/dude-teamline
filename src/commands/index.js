import path from 'path';
import fs from 'fs';

export default function (bot, uri) {
  const commandsDir = './';
  const commandsPath = path.join(__dirname, commandsDir);

  const commands = fs.readdirSync(commandsPath);
  commands
    .filter(name => name !== 'index.js')
    .forEach(file => {
      require(`${commandsPath}/${file}`)(bot, uri);
    });
}
