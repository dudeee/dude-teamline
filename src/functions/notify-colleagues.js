import moment from 'moment';
import _ from 'lodash';
import request from './request';
import workhoursModifications from './workhours-modifications';
import formatModification from './format-modification';

const POCKET_KEY = 'teamline.schedules.notify.messages';
export default async (bot, uri, modifications, employee) => {
  if (!modifications.length) return false;

  let list;
  try {
    list = await bot.pocket.get(POCKET_KEY);
  } catch (e) {
    list = [];
  }

  const channel = _.get(bot.config, 'teamline.schedules.notification.channel', 'schedules');
  const enableNotification = _.get(bot.config, 'teamline.schedules.notification.notify', true);
  const { get } = await request(bot, uri);

  let notify;
  try {
    notify = (await bot.pocket.get(`schedules.notify`))[employee.username] || [];
  } catch (e) {
    notify = [];
  }
  const names = enableNotification ? notify.map(a => `@${a}`).join(', ') : '';

  const raw = await get(`employee/${employee.id}/workhours`, {
    include: ['Timerange'],
  });

  return Promise.all(modifications.map(send));

  async function send(modification) {
    const mods = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
      id: {
        $not: modification.id,
      },
      start: {
        $gte: moment(modification.start).hours(0).minutes(0).seconds(0).toISOString(),
      },
      end: {
        $lte: moment(modification.end).hours(0).minutes(0).seconds(0).add(1, 'day').toISOString(),
      },
    });
    const workhours = workhoursModifications(bot, raw, mods);

    const text = formatModification(bot, modification, workhours, names);

    const msg = await bot.sendAsUser(employee.username, channel, text, {
      websocket: false,
      parse: 'full',
    });

    list.push({ modification: modification.id, message: msg.ts });
    await bot.pocket.put(POCKET_KEY, list);

    return msg;
  }
};
