import path from 'path';
import fs from 'fs';

export default function load(bot, uri, dir = '.') {
  const commandsPath = path.join(__dirname, dir);

  try {
    const commands = fs.readdirSync(commandsPath);
    commands
      .filter(name => name !== 'index.js')
      .forEach(file => {
        const fullPath = `${commandsPath}/${file}`;

        if (fs.statSync(fullPath).isDirectory()) {
          load(bot, uri, dir = file);
          return;
        }

        if (!fullPath.endsWith('.js')) return;

        require(fullPath)(bot, uri);
      });
  } catch (e) {
    bot.log.error('[teamline] error', e);
  }
}
