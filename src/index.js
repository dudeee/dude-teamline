import sync from './sync-users';
import _ from 'lodash';
import commands from './commands';
import path from 'path';
import jobs from './jobs';

const DEFAULT = {};

export default async bot => {
  _.defaults(bot.config.teamline, DEFAULT);
  const config = bot.config.teamline;
  const { uri } = config;

  await bot.i18n.load(path.join(__dirname, '../locales/'));

  try {
    commands(bot, uri);
    jobs(bot, uri);
  } catch (e) {
    bot.log.error('[teamline]', e);
  }

  bot.pocket.model('TeamlineNotified', { id: Number, expireAt: { type: Date, expires: 0 } });

  /*eslint-disable */
  bot.help('actions', 'Teamline: Manage your actions', `
*Defining actions*:
\`actions team > project > action\`
\`actions team > (role) > action\`

You can also define multiple actions in one message by dividing them with
line-breaks (note that you don't have to repeat the \`actions\` keyword):
\`\`\`
actions project > action
project > action
(role) > action
\`\`\`

*Creating projects on the fly*:
You can create projects on the fly by adding a plus sign before the project name.
\`actions team > +project > action\`

*Listing actions*:
You can list someone's actions in a date range (by default today):
\`actions @username 4 days ago - 3 days ago\` – Lists actions of \`@username\` between 4 days ago and 3 days ago
\`actions myself 2 days ago\` – Lists your actions defined 2 days ago
\`actions\` – By default, lists your actions for today

*Removing actions*:
You can remove your actions for today, each action is numbered in the list, you can use the number to
remove the action.
\`actions remove 2\` – remove your second action for today

You can also clear all your actions for today by issuing the following:
\`actions clear\``);

bot.help('list', 'Teamline: List items', `
The \`list\` command is there to help you get a list of items
of a specified model, this includes teams, actions, projects and roles.

*Listing items related to you*:
You can list items related to you:
\`list my teams\`
\`list my actions\`
\`list my roles\`
\`list my projects\`

*Listing someone else's items*:
\`list @username projects\`

*Filters*:
You can also specify a filter, filters help you list only the items you need:
\`list my undone projects\`
\`list my done projects\`
\`list my todo projects\`

These filters include:
*projects*:
- open
- closed
- done
- doing
- todo
- undone

*actions*:
- today
- past
`)

bot.help('schedules', 'Teamline: Manage weekly schedules', `
*View someone's weekly schedule*:
\`schedules @username\` – View \`@username\`'s weekly schedule
\`schedules\` – View your own weekly schedule

*Temporary modifications*:
Sometimes you want to make a change to your current week's schedule, maybe you are going
for a vacation, maybe you want to work some extra time, or maybe you want to swap two days!
You can specify a reason for these modifications on the second line of your message. (\`shift+enter\`)

You can add a timerange to your schedule this way:
\`schedules add from March 09 8:30 to March 09 15:00\`

You can subtract a timerange from your weekly schedule like so:
\`schedules subtract from March 10 9:30 to March 10 10:40\`

Sometimes, these modifications require privilage from your manager, in these cases, I will ask your
manager for the permission and notify you about it.

Your modification requests can be seen by issuing the following command:
\`schedules modifications\`
\`schedules modifications myself today to 1 month\`
\`schedules modifications @username today to 1 month\`

These modifications are marked by colors indicating their status:
- Yellow: Pending
- Green: Approved
- Red: Rejected
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
