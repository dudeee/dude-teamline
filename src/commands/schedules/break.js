import findEmployee from '../functions/find-employee';
import request from '../../request';
import humanDate from 'date.js';
import moment from 'moment';
// import { capitalize, groupBy } from 'lodash';

const INVALID_DATE = /invalid date/i;
export default (bot, uri) => {
  const { post } = request(bot, uri);

  bot.command('^schedules break (from)? <string> (to|for) <string>', async message => {
    const [from, to] = message.match;
    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    let start = humanDate(from);
    let end = humanDate(to);

    if (almostEqual(start, new Date())) start = moment(from, 'DD MMMM HH:mm');
    if (almostEqual(end, new Date())) end = moment(to, 'DD MMMM HH:mm');
    if (INVALID_DATE.test(start.toString())) {
      return message.reply(`Invalid start date *${from}*.`);
    }
    if (INVALID_DATE.test(end.toString())) {
      return message.reply(`Invalid end date *${to}*.`);
    }

    const employee = await findEmployee(uri, bot, message);

    await post(`employee/${employee.id}/break`, { start: start + 0, end: end + 0, reason });

    message.reply('Let me ask for permission 🕑');

    const userinfo = `${employee.username} ${employee.firstname} ${employee.lastname}`;
    const formattedFrom = moment(start).format('DD MMMM HH:mm');
    const formattedTo = moment(end).format('DD MMMM HH:mm');
    const [index] = await bot.ask('mahdi', `Hey, ${userinfo} wants to take a break ` +
                                           `from ${formattedFrom} to ${formattedTo}.\n` +
                                           `Do you grant the permission?`, ['Yes', 'No']);

    if (index === 0) {
      message.reply('Alright, your break request is accepted. Have fun! ⛱');
    } else {
      message.reply('Your request for a break is not accepted.');
    }
  });
};

const almostEqual = (a, b) =>
  a.getYear() === b.getYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDay() === b.getDay() &&
  a.getHours() === b.getHours() &&
  a.getMinutes() === b.getMinutes();
