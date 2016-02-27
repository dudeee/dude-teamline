import findEmployee from '../functions/find-employee';
import request from '../../request';
import humanDate from 'date.js';
import moment from 'moment';

const INVALID_DATE = /invalid date/i;
export default (bot, uri) => {
  const { get, post, put } = request(bot, uri);

  bot.command('^vacation (from|starting|starting in)? <string> (to|for) <string>', async message => { //eslint-disable-line
    let [from, to] = message.match;
    from = from.trim();
    to = to.trim();

    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    let start = humanDate(from);
    let end = humanDate(to, message.preformatted.includes('for') ? start : new Date());

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

    const userinfo = `${employee.firstname} ${employee.lastname}`;
    const formattedFrom = moment(start).format('DD MMMM HH:mm');
    const formattedTo = moment(end).format('DD MMMM HH:mm');
    const manager = bot.config.teamline.vacations.manager;
    const [index] = await bot.ask(manager, `Hey, ${userinfo} wants to go on a vacation ` + //eslint-disable-line
                                           `from ${formattedFrom} to ${formattedTo}.\n` +
                                           (reason ? `Reason: ${reason}` : ``) +
                                           `Do you grant the permission?`, ['Yes', 'No']);

    if (index === 0) {
      message.reply('Alright, your vacation request was accepted. Have fun! ⛱');
      await put(`break/${b.id}`, { status: 'accepted' });
    } else {
      message.reply('Your vacation request was rejected. 😟');
      await put(`break/${b.id}`, { status: 'rejected' });
    }
  });

  bot.command('vacations [char]', async message => {
    const [username] = message.match;
    const employee = await findEmployee(uri, bot, message, username);
    const breaks = await get(`employee/${employee.id}/breaks`);

    const name = username ? `${employee.firstname} ${employee.lastname}'s` : 'Your';

    const attachments = Array.from(printBreaks(breaks));
    await message.reply(`${name} vacations:`, { attachments, websocket: false });
  });

  const printBreaks = (list) =>
    list.map(entry => {
      const format = 'DD MMMM YYYY, HH:mm';

      const fields = [{
        title: 'From',
        value: moment(entry.start).format(format),
        short: true
      }, {
        title: 'To',
        value: moment(entry.end).format(format),
        short: true
      }];

      if (entry.reason) {
        fields.push({
          title: 'Reason',
          value: entry.reason,
          short: false
        });
      }

      const colors = {
        accepted: 'good',
        pending: 'warning',
        rejected: 'danger'
      };

      const fallback = `${fields[0].title}: *${fields[0].value}*\n` +
                       `${fields[1].title}: *${fields[1].value}*\n`;

      return { color: colors[entry.status], fields, fallback };
    });
};

const almostEqual = (a, b) =>
  a.getYear() === b.getYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDay() === b.getDay() &&
  a.getHours() === b.getHours() &&
  a.getMinutes() === b.getMinutes();
