import teamline from 'teamline';
import { request, findEmployee, printList, wait } from './utils';
import sync from './sync-users';
import commands from './commands';
import management from './management';
import _ from 'lodash';

export default async bot => {
  const server = await teamline(bot.config.teamline);
  const uri = server.info.uri + (_.get(bot, 'config.teamline.crud.prefix') || '');

  try {
    commands(bot, uri);
    management(bot, uri);
  } catch (e) {
    bot.log.error(e);
  }

  bot.agenda.define('ask-for-actions', async (job, done) => {
    const d = new Date();
    if (d.getHours() !== 9) return;

    const users = bot.users;

    const RATE_LIMIT = 1000;

    for (const user of users) {
      const emp = await request('get', `${uri}/employee?username=${user.name}`);
      const a = await request('get', `${uri}/employee/${emp.id}/actions/today`);
      if (a.length) continue;

      bot.sendMessage(user.id, 'Hey! What are you going to do today? 😃');
      await wait(RATE_LIMIT);
    }

    done();
  });

  bot.agenda.define('publish-actions', async (job, done) => {
    const d = new Date();
    if (d.getHours() !== 10) return;

    const users = bot.users;

    await* users.map(async user => {
      const employee = await findEmployee(uri, bot, { user: user.id });

      const name = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;
      const url = `${uri}/employee/${employee.id}/actions/today?include=Project`;
      const actions = await request('get', url);

      if (!actions.length) {
        return;
      }

      const list = printList(actions);

      bot.sendMessage('actions', `${name}\n${list}`);
    });

    done();
  });

  const job = bot.agenda.create('ask-for-actions');
  job.repeatAt('9:30am');
  job.save();

  const publishJob = bot.agenda.create('publish-actions');
  publishJob.repeatAt('10:00am');
  publishJob.save();

  /*
  teamline add \`(project)\` \`task\` – add a new action for the corresponding project
  teamline done \`id\` – mark task #id as done
  teamline undone \`id\` – mark task #id as undone
  teamline manage done \`type\` \`id\` – mark the object of \`type\` with \`id\` as done
  teamline manage undone \`type\` \`id\` – mark the object of \`type\` with \`id\` as undone
  */

  // add a help record for your plugin's commands
  bot.help('teamline', 'Manage teamline', `
teamline todo – view your tasks for today
teamline todo [project] > [action] – set your actions for today, separate actions by line breaks
teamline my projects/roles/actions/teams – list models associated with you
teamline all projects/roles/actions/teams/goals/okrs – list all models

Managers have access to these commands
teamline manage add \`type\` \`name\` – add a new object of \`type\` with the specified \`name\`
teamline manage delete \`type\` \`id\` – delete the object of \`type\` with \`id\`
teamline manage connect \`type\` \`id\` with \`type\` \`id\` – connect two models with each other
Example: teamline manage connect role 1 with employee 2

\`type\` is one of the following: okr, goal, project, team, role, company, employee

*Scopes* are filters which help you find the items you want, some examples include:
done, undone, past (action), future (action), today (action)
`);

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
