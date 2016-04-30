import sync from './sync-users';
import _ from 'lodash';
import commands from './commands';
import path from 'path';
import jobs from './jobs';

const DEFAULT = {};

export default async bot => {
  const config = _.defaults(bot.config.teamline, DEFAULT);
  const { uri } = config;

  await bot.i18n.load(path.join(__dirname, '../locales/'));

  try {
    commands(bot, uri);
    jobs(bot, uri);
  } catch (e) {
    bot.log.error('[teamline]', e);
  }

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
\`schedules @username [date]\` – View \`@username\`'s weekly schedule on the specified time (e.g. next week)
\`schedules [date]\` – View your own weekly schedule

*Temporary modifications*:
Sometimes you want to make a change to your current week's schedule, maybe you are going
for a vacation, maybe you want to work some extra time, or maybe you want to swap two days!
You can specify a reason for these modifications on the second line of your message. (\`shift+enter\`)

You can omit the \`schedule\` keyword from commands, so \`out\` is equivalent to \`schedule out\`.

*In*:
You can add a timerange to your schedule this way:
\`schedule in [timerange]\`
\`schedules in for 2 hours\` – Assumes you will be available 2 extra hours at the end of your working hour
So, if your normal working hour is until 18:00, it's assumed that you will stay until 20:00
\`schedules in 19:00 to 20:00\` – Also accepts specific ranges
\`schedules in tomorrow 8:00 to tomorrow 18:00\`

*Out*:
You can subtract a timerange from your weekly schedule like so:
\`schedules out [timerange]\`
\`schedules out for 2 hours\` – Assumes you won't be available for the next 2 hours (from now for 2 hours)
\`schedules out until 16:00\` – Assumes you won't be available from now until 16:00
\`schedules out tomorrow 8:30 to tomorrow 15:00\` – Also accepts specific ranges

*Shift*:
Sometimes you won't be available for some time today, but you want to stay at office for some extra hour.
An example would be like this: Imagine your working hour for today is from 8:30 to 18:00, now you have
some work to do in the next 2 hours, so you won't be available, but you will come back to office and stay until
20:00 to fill the gap. In these situations you can use another command, called \`shift\` to do this instead of
two commands. It's like an alias for \`in\` and \`out\`.

The example above could be done like this: \`schedules shift for 2 hours\`
It's the equivalent of issuing two commands: \`schedules out for 2 hours\` \`schedules in for 2 hours\`

*Undo*:
You can also undo your changes using \`schedules undo\`.

*Notify*:
You can choose whether you get notified about someone's modifications or not.
To watch someone's modifications:
\`schedules notify @someone\` – get a notification whenever @someone has a schedule modification

To view your list:
\`schedules notify\` – view your notify list

To unwatch someone (undo \`notify\`):
\`schedules !notify @someone\` – do not get a notification from @someone anymore
`);

bot.help('available', 'See when someone is available in one day',
`It's for when you want to make sure someone is available at the office at a specified time.
The usage is simple:
\`available @someone\` – See if he's available today (or right now).
\`available @someone [date]\`
\`available @someone tomorrow\` – See if someone is available on a certain date`)
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
