if (!global._babelPolyfill) {
  require('babel/polyfill');
}
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

async function load(dir = '.') {
  try {
    const filesPath = path.join(__dirname, dir);

    const files = fs.readdirSync(filesPath).filter(name => name !== 'index.js');

    for (const file of files) {
      const fullPath = `${filesPath}/${file}`;

      if (fs.statSync(fullPath).isDirectory()) {
        await load(dir = file);
        return;
      }

      if (!fullPath.endsWith('.js')) return;

      // const mocha = new Mocha();
      // mocha.addFile(fullPath);
      // await new Promise(resolve => {
      //   mocha.run(failures => {
      //     if (failures) process.exit(failures);
      //     resolve();
      //   });
      // });
      const compilers = 'js:babel/register,js:babel/polyfill';
      await new Promise((resolve, reject) => {
        const p = spawn('mocha', [fullPath, '--compilers', compilers], { stdio: 'inherit' });

        p.on('close', resolve);
        p.on('error', reject);
      });
    }
  } catch (e) {
    console.error(e, e.stack);
  }
}

load();
