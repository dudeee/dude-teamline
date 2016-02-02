import teamline from 'teamline';
import { request, findEmployee, printList, wait } from './utils';
import sync from './sync-users';
import _ from 'lodash';
import commands from './commands';

const timezone = 'Asia/Tehran';

const DEFAULT = {
  schedules: {
    'ask-for-actions': '9:30',
    'publish-actions': '10:00'
  }
};

export default async bot => {
  _.defaults(bot.config.teamline, DEFAULT);

  const server = await teamline(bot.config.teamline);
  const uri = server.info.uri + (_.get(bot, 'config.teamline.crud.prefix') || '');

  try {
    commands(bot, uri);
  } catch (e) {
    bot.log.error(e);
  }

  const askForActions = bot.config.teamline.schedules['ask-for-actions'];
  bot.agenda.define('ask-for-actions', async (job, done) => {
    const d = new Date();
    const [h, m] = askForActions.split(':');
    if (d.getHours() !== +h || d.getMinutes() !== +m) return;

    const users = bot.users;

    const RATE_LIMIT = 1000;

    for (const user of users) {
      const emp = await request('get', `${uri}/employee?username=${user.name}`);
      if (!emp) continue;
      const a = await request('get', `${uri}/employee/${emp.id}/actions/today`);
      if (a.length) continue;

      if (user.name !== 'mahdi' && user.name !== 'guy') continue;
      bot.sendMessage(user.name, 'Hey! What are you going to do today? 😃');
      await wait(RATE_LIMIT);
    }

    done();
  });

  const publishActions = bot.config.teamline.schedules['publish-actions'];
  bot.agenda.define('publish-actions', async (job, done) => {
    const d = new Date();
    const [h, m] = publishActions.split(':');
    if (d.getHours() !== +h || d.getMinutes() !== +m) return;

    const users = bot.users;

    await* users.map(async user => {
      const employee = await findEmployee(uri, bot, { user: user.id });

      if (!employee) return;

      const name = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;
      const url = `${uri}/employee/${employee.id}/actions/today?include=Project`;
      const actions = await request('get', url);

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

  const job = bot.agenda.create('ask-for-actions', {
    repeatTimezone: timezone
  });
  job.repeatAt(askForActions);
  job.save();

  const publishJob = bot.agenda.create('publish-actions', {
    repeatTimezone: timezone
  });
  publishJob.repeatAt(publishActions);
  publishJob.save();

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
