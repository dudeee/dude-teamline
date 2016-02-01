import { request, findEmployee, getWeekday, clockEmoji } from '../utils';
import { capitalize } from 'lodash';
import humanDate from 'date.js';


const printHours = hours => {
  if (!hours.length) {
    return 'Oops! I got nothing to show! 😶';
  }
  let output = (hours.length > 1)
  ? ':timer_clock: Your working hours plan is:\n'
  : `:timer_clock: Your working hours plan for *${hours[0].weekday}* is:\n`;
  output += hours.map((hour, id) =>
    `#${id + 1}- *${capitalize(hour.weekday)}* from ${clockEmoji(hour.start)}` +
    ` *${hour.start}* to ${clockEmoji(hour.end)} *${hour.end}*`).join('\n');
  return output;
};

export default async (bot, uri) => {
  bot.listen(/(?:workhours?|wh)\s?(.+)?/i, async message => {
    const [time] = message.match;
    const employee = await findEmployee(uri, bot, message);

    let workHours;
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    if (weekdays.includes(time)) {
      workHours = await request('get', `${uri}/employee/${employee.id}` +
      `/workhours?weekday=${time}`);
      return message.reply(printHours(workHours));
    }

    try {
      const date = humanDate(time);
      if (date instanceof Date) {
        const weekday = getWeekday(date);
        workHours = await request('get', `${uri}/employee/${employee.id}` +
        `/workhours?weekday=${weekday}`);
        return message.reply(printHours(workHours));
      }
    } catch (e) {
      bot.log.verbose(e);
    }

    workHours = await request('get', `${uri}/employee/${employee.id}/workhours`);
    message.reply(printHours(workHours));
  });
};
