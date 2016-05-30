import moment from 'moment';
import _ from 'lodash';
import computeWorkhours from './compute-workhours';
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

  let notify;
  try {
    notify = (await bot.pocket.get(`schedules.notify`))[employee.username] || [];
  } catch (e) {
    notify = [];
  }
  const names = enableNotification ? notify.map(a => `@${a}`).join(', ') : '';

  return Promise.all(modifications.map(send));

  async function send(modification) {
    const start = moment(modification.start).hours(0).minutes(0).seconds(0);
    const end = moment(modification.end).hours(0).minutes(0).seconds(0).add(1, 'day');

    const workhours = await computeWorkhours(bot, uri, employee, start, end, {
      id: {
        $not: modification.id,
      },
    });

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
