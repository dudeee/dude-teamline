import { wait } from './utils';
import request from './request';
import sync from './sync-users';
import _ from 'lodash';
import commands from './commands';
import path from 'path';
import moment from 'moment';

const DEFAULT = {};

export default async bot => {
  _.defaults(bot.config.teamline, DEFAULT);
  const config = bot.config.teamline;
  const { uri } = config;
  const { get } = request(bot, uri);

  await bot.i18n.load(path.join(__dirname, '../locales/'));

  try {
    commands(bot, uri);
  } catch (e) {
    bot.log.error('[teamline]', e);
  }

  const employees = await get('employees');
  bot.agenda.define('ask-for-actions', async (job, done) => {
    const d = moment();
    for (const user of bot.users) {
      const emp = employees.find(a => a.username === user.name);
      if (emp._notified) continue;

      const actions = await get(`employee/${emp.id}/actions/today`);
      if (actions.length) continue;

      const workhours = await get(`employees/${emp.id}/workhour`, {
        weekday: d.day(),
        include: 'Timerange'
      });

      const firstTimerange = workhours.Timeranges[0];
      const schedule = {
        start: moment(firstTimerange.start, 'HH:mm'),
        end: moment(firstTimerange.end, 'HH:mm')
      };

      if (d.hours() > schedule.start.hours() && d.minutes() > schedule.start.minutes()) {
        bot.sendMessage(user.name, 'Hey! What are you going to do today? 😁');
        const RATE_LIMIT = 1000;
        await wait(RATE_LIMIT);
      }

      emp._notified = true;
    }

    done();
  });

  try {
    const job = bot.agenda.create('ask-for-actions');
    job.repeatEvery('15 minutes');
    job.save();
  } catch (e) {
    bot.log.error('[teamline] error scheduling ask-for-actions and publish-actions', e);
  }

  /*eslint-disable */
  bot.help('actions', 'Manage your actions', `
\`actions [@username | myself] [date | daterange]\` – view someone's actions (by default yourself) in the specified range / date (by default today)
\`actions [team] > <project> > <action>\` – set your actions for today, separate actions by line breaks
\`actions clear\` – clear your actions for today
\`actions remove <id>\` – remove the specified action
\`list [@username | my | all] [filter] [model]\` – list entities of one's or all employees/actions/projects/teams, filters: done, undone, closed
`);

bot.help('schedules', 'Manage schedules and vacations', `
\`schedules [@username | myself]\` view someone's weekly schedule (working hours)
`)

bot.help('vacations', 'View and request vacations', `
\`vacation [@username] from <start> (to | for) <end>\` – request a vacation
\`vacations [@username | myself]\` – view someone's vacations; red: rejected, green: approved, yellow: pending
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
