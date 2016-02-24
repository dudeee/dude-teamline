import { findEmployee, printList, wait } from './utils';
import request from './request';
import sync from './sync-users';
import _ from 'lodash';
import commands from './commands';
import path from 'path';

const DEFAULT = {
  schedules: {
    'ask-for-actions': '9:30am',
    'publish-actions': '10:00am'
  }
};

export default async bot => {
  _.defaults(bot.config.teamline, DEFAULT);
  const config = bot.config.teamline;
  const { schedules, uri } = config;
  const { get } = request(bot, uri);

  await bot.i18n.load(path.join(__dirname, '../locales/'));

  try {
    commands(bot, uri);
  } catch (e) {
    bot.log.error('[teamline]', e);
  }

  const askForActions = schedules['ask-for-actions'].split(':').map(Number.parseFloat);
  bot.agenda.define('ask-for-actions', async (job, done) => {
    const d = new Date();
    const [h, m] = askForActions;
    if (d.getHours() !== h || d.getMinutes() !== m) return done();

    const users = bot.users;

    const RATE_LIMIT = 1000;

    for (const user of users) {
      const emp = await get(`employee?username=${user.name}`);
      if (!emp) continue;
      const a = await get(`employee/${emp.id}/actions/today`);
      if (a.length) continue;

      bot.sendMessage(user.name, 'Hey! What are you going to do today? 😃');
      await wait(RATE_LIMIT);
    }

    done();
  });

  const publishActions = schedules['publish-actions'].split(':').map(Number.parseFloat);
  bot.agenda.define('publish-actions', async (job, done) => {
    const d = new Date();
    const [h, m] = publishActions;
    if (d.getHours() !== h || d.getMinutes() !== m) return;

    const users = bot.users;

    await* users.map(async user => {
      const employee = await findEmployee(uri, bot, { user: user.id });

      if (!employee) return;

      const name = `${employee.firstname} ${employee.lastname}`;
      const url = `employee/${employee.id}/actions/today?include=Project`;
      const actions = await get(url);

      if (!actions.length) {
        return;
      }

      const list = printList(actions);

      bot.sendMessage('actions', `${name}\n${list}`, {
        websocket: false,
        parse: 'full'
      });
    });

    done();
  });

  try {
    const job = bot.agenda.create('ask-for-actions');
    job.repeatAt(schedules['ask-for-actions']);
    job.save();

    const publishJob = bot.agenda.create('publish-actions');
    publishJob.repeatAt(schedules['publish-actions']);
    publishJob.save();
  } catch (e) {
    bot.log.error('[teamline] error scheduling ask-for-actions and publish-actions', e);
  }

  /*eslint-disable */
  bot.help('actions', 'Manage your actions', `
\`actions [@username | myself] [date | daterange]\` – view someone's actions (by default yourself) in the specified range / date (by default today)
\`actions [project] > [action]\` – set your actions for today, separate actions by line breaks
\`actions clear\` – clear your actions for today
\`actions remove <id>\` – remove the specified action
\`list [@username | my | all] [model]\` – list entities of one's or all employees/actions/projects/teams
`);
bot.help('schedules', 'Manage schedules and vacations', `
\`vacation <start> (to | for) <end>\` – request a vacation
\`schedules <@username | myself>\` view someone's weekly schedule (working hours)
`)
  /*eslint-enable */

  try {
    const stats = await sync(bot, uri);

    bot.log.verbose(`[teamline] Synced Teamline Users with Slack
Created: ${stats.created}
Updated: ${stats.updated}
Deleted: ${stats.deleted}
Untouched: ${stats.untouched}`);
  } catch (e) {
    bot.log.error(e);
  }
};
