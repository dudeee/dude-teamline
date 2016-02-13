import { findEmployee, printList, wait } from './utils';
import request from './request';
import sync from './sync-users';
import _ from 'lodash';
import commands from './commands';

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

      const name = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;
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

  /*
  teamline add \`(project)\` \`task\` – add a new action for the corresponding project
  teamline done \`id\` – mark task #id as done
  teamline undone \`id\` – mark task #id as undone
  teamline manage done \`type\` \`id\` – mark the object of \`type\` with \`id\` as done
  teamline manage undone \`type\` \`id\` – mark the object of \`type\` with \`id\` as undone

  Managers have access to these commands
  teamline manage add \`type\` \`name\` – add a new object of \`type\` with the specified \`name\`
  teamline manage delete \`type\` \`id\` – delete the object of \`type\` with \`id\`
  teamline manage connect \`type\` \`id\` with \`type\` \`id\` – connect two models with each other
  Example: teamline manage connect role 1 with employee 2

  \`type\` is one of the following: okr, goal, project, team, role, company, employee

  *Scopes* are filters which help you find the items you want, some examples include:
  done, undone, past (action), future (action), today (action)
  */

  // add a help record for your plugin's commands
  /*eslint-disable */
  bot.help('actions', 'Manage your actions', `
\`actions [@username | myself] [date | daterange]\` – view someone's actions (by default yourself) in the specified range / date (by default today)
\`actions [project] > [action]\` – set your actions for today, separate actions by line breaks
\`actions clear\` – clear your actions for today
\`actions remove <id>\` – remove the specified action
\`list [@username | my | all] [model]\` – list entities of one's or all employees/actions/projects/teams
`);
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
