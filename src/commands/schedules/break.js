import findEmployee from '../functions/find-employee';
import request from '../../request';
import humanDate from 'date.js';
import moment from 'moment';
import { capitalize } from 'lodash';

const INVALID_DATE = /invalid date/i;
export default (bot, uri) => {
  const { get, post, put } = request(bot, uri);

  bot.command('^schedules break (from)? <string> (to|for) <string>', async message => {
    const [from, to] = message.match;
    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    let start = humanDate(from);
    let end = humanDate(to);

    if (from !== 'now' && almostEqual(start, new Date())) start = moment(from, 'DD MMMM HH:mm');
    if (from !== 'now' && almostEqual(end, new Date())) end = moment(to, 'DD MMMM HH:mm');
    if (INVALID_DATE.test(start.toString())) {
      return message.reply(`Invalid start date *${from}*.`);
    }
    if (INVALID_DATE.test(end.toString())) {
      return message.reply(`Invalid end date *${to}*.`);
    }

    const employee = await findEmployee(uri, bot, message);

    const data = { start: start + 0, end: end + 0, reason };
    const b = await post(`employee/${employee.id}/break`, data);

    const userinfo = `${employee.username} ${employee.firstname} ${employee.lastname}`;
    const formattedFrom = moment(start).format('DD MMMM HH:mm');
    const formattedTo = moment(end).format('DD MMMM HH:mm');
    const [index] = await bot.ask('mahdi', `Hey, ${userinfo} wants to take a break ` + //eslint-disable-line
                                           `from ${formattedFrom} to ${formattedTo}.\n` +
                                           (reason ? `Reason: ${reason}` : ``) +
                                           `Do you grant the permission?`, ['Yes', 'No']);

    if (index === 0) {
      message.reply('Alright, your break request was accepted. Have fun! ⛱');
      await put(`break/${b.id}`, { status: 'accepted' });
    } else {
      message.reply('Your break request was rejected. 😟');
      await put(`break/${b.id}`, { status: 'rejected' });
    }
  });

  bot.command('schedules breaks [char]', async message => {
    const [username] = message.match;
    const employee = await findEmployee(uri, bot, message, username);
    const breaks = await get(`employee/${employee.id}/breaks`);

    message.reply(printBreaks(breaks));
  });
};

const almostEqual = (a, b) =>
  a.getYear() === b.getYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDay() === b.getDay() &&
  a.getHours() === b.getHours() &&
  a.getMinutes() === b.getMinutes();

const printBreaks = list =>
  list.map(entry => {
    const format = 'DD MMMM YYYY, HH:mm';
    const from = moment(entry.start).format(format);
    const to = moment(entry.end).format(format);
    return `From: *${from}*\n` + //eslint-disable-line
           `To: *${to}*\n` +
           (entry.reason ? `Reason: *${entry.reason}*\n` : '') +
           `Status: *${capitalize(entry.status)}*`;
  }).join('\n\n');
