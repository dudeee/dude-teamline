import moment from 'moment';
import request from '../functions/request';
import computeWorkhours from '../functions/compute-workhours';
import formatModification from '../functions/format-modification';
import messageUrl from '../functions/message-url';
import _ from 'lodash';

export default async (bot, uri) => {
  const { get } = request(bot, uri);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const job = bot.schedule.scheduleJob('0 0 8 * * * *', async () => {
    const enabled = _.get(bot.config, 'teamline.daily_schedule_report', true);
    if (!enabled) return null;

    const channel = _.get(bot.config, 'teamline.schedules.notification.channel', 'schedules');

    const today = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
    const modifications = await get('schedulemodifications/accepted', {
      start: {
        $gte: today.toISOString(),
      },
      end: {
        $lt: today.clone().add(1, 'day').toISOString(),
      },
      include: ['Employee'],
    });

    const head = bot.t('teamline.schedules.notification.daily_report_head');

    let pairs;
    try {
      pairs = await bot.pocket.get('teamline.schedules.notify.messages');
    } catch (e) {
      pairs = [];
    }

    await Promise.all(modifications.map(async mod => {
      const r = _.find(pairs, { modification: mod.id });
      if (!r) return;

      const url = await messageUrl(bot, channel, r.message);
      mod.url = url;

      return url;
    }));

    const attachments = _.filter(await Promise.all(modifications.map(async mod => {
      try {
        const employee = mod.Employee;
        const start = today;
        const end = start.clone().add(1, 'day');
        const workhours = await computeWorkhours(bot, uri, employee, start, end, {
          id: {
            $not: mod.id,
          },
        });
        const text = formatModification(bot, mod, workhours, []);

        return {
          author_name: mod.Employee.username,
          author_link: mod.url,
          author_icon: bot.find(mod.Employee.username).profile.image_48,
          text,
          mrkdwn_in: ['text'],
        }
      } catch (e) {
        //
      }
    })));

    if (!attachments.length) return;

    bot.sendMessage(channel, head, {
      attachments,
      websocket: false,
      unfurl_links: true,
    });

    try {
      bot.log.verbose('[teamline] daily-schedule-report');

    } catch (e) {
      console.error(e);
    }
  });

  return job;
};
