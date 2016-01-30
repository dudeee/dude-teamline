import path from 'path';
import fs from 'fs';

export default function (bot, uri) {
  const commandsDir = './';
  const commandsPath = path.join(__dirname, commandsDir);

  const commands = fs.readdirSync(commandsPath);
  console.log(commands);
  console.log('---------------');
  commands
    .filter(name => name !== 'index.js')
    .forEach(file => {
      console.log(`SHIT! => ${file}`);
      require(`${commandsPath}/${file}`)(bot, uri);
    });
}
