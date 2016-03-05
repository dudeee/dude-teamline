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

  bot.pocket.model('TeamlineNotified', { id: Number, expireAt: { type: Date, expires: 0 } });

  bot.agenda.define('ask-for-actions', async (job, done) => {
    const employees = await get('employees');

    const d = moment();
    for (const user of bot.users) {
      const emp = employees.find(a => a.username === user.name);
      if (!emp) continue;
      const notified = await bot.pocket.find('TeamlineNotified', { id: emp.id }).exec();
      if (notified.length) continue;

      const actions = await get(`employee/${emp.id}/actions/today`);
      if (actions.length) continue;

      const workhours = await get(`employee/${emp.id}/workhour`, {
        weekday: d.day(),
        include: 'Timerange'
      });

      if (!workhours || !workhours.Timeranges.length) continue;

      const firstTimerange = workhours.Timeranges[0];
      const schedule = {
        start: moment(firstTimerange.start, 'HH:mm'),
        end: moment(firstTimerange.end, 'HH:mm')
      };

      const diff = (d.hours() - schedule.start.hours()) * 60
                 + (d.minutes() - schedule.start.minutes());
      if (diff > 0) {
        await bot.sendMessage(user.name, 'Hey! What are you going to do today? 😁');
        const RATE_LIMIT = 1000;
        await wait(RATE_LIMIT);


        const expireAt = moment().add(1, 'day')
                            .hours(schedule.start.hours())
                            .minutes(schedule.start.minutes() - 1);

        bot.pocket.save('TeamlineNotified', { id: emp.id, expireAt });
      }
    }

    done();
  });

  try {
    const job = bot.agenda.create('ask-for-actions');
    job.repeatEvery('1 minute');
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
\`vacation [@username] from <start> (to | for) <end> ⏎
Reason here\` – request a vacation, you can optionally write a reason on the second line
\`vacations [@username | myself]\` – view someone's vacations; red: rejected, green: approved, yellow: pending
\`vacations remove <id>\` – remove vacation
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
