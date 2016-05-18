import { wait } from '../functions/utils';
import moment from 'moment';
import request from '../functions/request';
import workhoursModifications from '../functions/workhours-modifications';
import _ from 'lodash';

export default async (bot, uri) => {
  const { get } = request(bot, uri);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  let list;

  const job = bot.schedule.scheduleJob('0 * * * * * *', async () => {
    const enabled = _.get(bot.config, 'teamline.ask_for_actions', true);
    if (!enabled) return null;

    try {
      bot.log.verbose('[teamline] ask-for-actions');
      try {
        list = (await bot.pocket.get('teamline.notified')) || [];
      } catch (e) {
        await bot.pocket.put('teamline.notified', []);
        list = [];
      }

      const stats = { sent: 0, skipped: 0 };
      const employees = await get('employees');

      const d = moment();
      for (const user of bot.users) {
        const emp = employees.find(a => a.username === user.name);
        if (!emp) {
          stats.skipped++;
          continue;
        }

        let notified = _.find(list, { id: emp.id });
        if (notified && moment(notified.expireAt).isSameOrBefore(moment())) {
          list.splice(list.indexOf(notified), 1);
          await bot.pocket.put('teamline.notified', list);
          notified = false;
        }

        if (notified) {
          stats.skipped++;
          continue;
        }

        const actions = await get(`employee/${emp.id}/actions/today`);
        if (actions.length) {
          stats.skipped++;
          continue;
        }

        const rawWorkhours = await get(`employee/${emp.id}/workhours`, {
          weekday: d.weekday(),
          include: 'Timerange'
        });
        const modifications = await get(`employee/${emp.id}/schedulemodifications/accepted`, {
          start: {
            $gte: d.clone().hours(0).minutes(0).seconds(0).toISOString()
          },
          end: {
            $lte: d.clone().hours(0).minutes(0).seconds(0).add(1, 'day').toISOString()
          }
        });

        const [workhours] = workhoursModifications(bot, rawWorkhours, modifications);

        if (!workhours || !workhours.Timeranges.length) {
          stats.skipped++;
          continue;
        }

        const firstTimerange = workhours.Timeranges[0];
        const schedule = {
          start: moment(firstTimerange.start, 'HH:mm'),
          end: moment(firstTimerange.end, 'HH:mm')
        };

        const diff = (d.hours() - schedule.start.hours()) * 60
                   + (d.minutes() - schedule.start.minutes());
        const delay = _.get(bot.config, 'teamline.actions.ask.delay') || 30;
        if (diff >= delay) {
          const expireAt = moment().add(1, 'day')
                              .hours(schedule.start.hours())
                              .minutes(schedule.start.minutes() - 1);

          list.push({ id: emp.id, expireAt: expireAt.toISOString() });
          await bot.pocket.put('teamline.notified', list);

          await bot.sendMessage(user.name, bot.t('teamline.actions.ask'));
          const RATE_LIMIT = 1000;
          await wait(RATE_LIMIT);
          stats.sent++;
        } else {
          stats.skipped++;
        }
      }

      return stats;
    } catch (e) {
      bot.log.error('[teamline, ask-for-actions]', e);
    }
  });

  return job;
};
