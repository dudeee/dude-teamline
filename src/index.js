import teamline from 'teamline';
import moment from 'moment';
import unirest from 'unirest';
import { request } from './utils';
import sync from './sync-users';
import commands from './commands';
import management from './management';
import _ from 'lodash'

export default async bot => {
  const { numbers } = bot.utils;
  let server = await teamline(bot.config.teamline);
  let uri = server.info.uri + (_.get(bot, 'config.teamline.crud.prefix') || '');

  commands(bot, uri);
  management(bot, uri);

	bot.agenda.define('ask-for-tasks', async (job, done) => {
		let users = bot.users;

    await* users.map(async user => {
      let employee = await findEmployee(uri, bot, { user });
      let undone = await request(`${uri}/employee/${employee.id}/actions/undone`);

      if (undone.length) {
        bot.sendMessage(user.name, `What are you going to do today? 😃
Also, you have ${undone.length} actions left from yesterday, too, might want to check them out.`);
      } else {
    		bot.sendMessage(user.name, 'Hey! What are you going to do today? 😃');
      }
    });

    done();
	});

  let job = bot.agenda.create('ask-for-tasks');
  job.repeatAt('8:30am');
  job.save();

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

  let stats = await sync(bot, uri);

  bot.log.verbose(`[teamline] Synced Teamline Users with Slack
Created: ${stats.created}
Updated: ${stats.updated}
Deleted: ${stats.deleted}
Untouched: ${stats.untouched}`);
}
