import findEmployee from '../functions/find-employee';
import request from '../../request';
import humanDate from 'date.js';
import moment from 'moment';

const INVALID_DATE = /invalid date/i;
export default (bot, uri) => {
  const { get, post, put, del } = request(bot, uri);

  bot.command('^vacation [char] (from|starting|starting in) <string> (to|for) <string>', async message => { //eslint-disable-line
    let [username, from, to] = message.match;
    username = username.trim();
    from = from.trim();
    to = to.trim();

    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;


    let start = moment(from, 'DD MMMM HH:mm');
    let end = moment(to, 'DD MMMM HH:mm');
    if (INVALID_DATE.test(start.toString())) {
      start = humanDate(from);
    }
    if (INVALID_DATE.test(end.toString())) {
      end = humanDate(to, message.preformatted.includes('for') ? start : new Date());
      if (end < start) end = humanDate(to, start);
    }

    const employee = await findEmployee(uri, bot, message, username);

    const data = { start: start.toISOString(), end: end.toISOString(), reason };
    const b = await post(`employee/${employee.id}/break`, data);

    const userinfo = `${employee.firstname} ${employee.lastname}`;
    const formattedFrom = moment(start).format('DD MMMM HH:mm');
    const formattedTo = moment(end).format('DD MMMM HH:mm');
    const manager = bot.config.teamline.vacations.manager;
    message.reply('Your request for a vacation is submitted!');

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

  bot.command('vacations remove [number]', async message => {
    const [id] = message.match;
    await del(`break/${id}`);

    message.reply(`Removed vacation #${id}`);
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

      return { color: colors[entry.status], fields, fallback, author_name: `#${entry.id}` };
    });
};
