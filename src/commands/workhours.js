import { request, findEmployee, getWeekday } from '../utils';
import { capitalize } from 'lodash';


const printHours = hours => {
  if (!hours.length) {
    return 'Nothing to show 😶';
  }
  let output = ':timer_clock: Your working hours plan is:\n';
  output += hours.map((hour, id) =>
    `#${id + 1}- *${capitalize(hour.weekday)}* from *${hour.start}* to *${hour.end}*`).join('\n'
  );
  return output;
};

export default async (bot, uri) => {
  bot.listen(/(?:workhours|wh)\s?(\w+)?/i, async message => {
    const [method] = message.match;
    const employee = await findEmployee(uri, bot, message);
    let workHours;
    if (!method || method === 'list') {
      workHours = await request('get', `${uri}/employee/${employee.id}/workhours`);
      message.reply(printHours(workHours));
    }
    if (method === 'tomorrow') {
      const today = new Date();
      const weekday = getWeekday(today.getDay() + 1);
      workHours = await request('get', `${uri}/employee/${employee.id}` +
      `/workhours?weekday=${weekday}`);
      message.reply(printHours(workHours));
    }
  });
};
