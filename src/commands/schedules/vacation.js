import findEmployee from '../functions/find-employee';
import request from '../../request';
import humanDate from 'date.js';
import moment from 'moment';

export default (bot, uri) => {
  const { get, post, put, del } = request(bot, uri);

  moment.relativeTimeThreshold('m', 60);
  moment.relativeTimeThreshold('h', Infinity);

  bot.command('^vacation(s)? [char] (from|starting|starting in) <string> (to|for) <string>', async message => { //eslint-disable-line
    let [username, from, to] = message.match;
    username = username.trim();
    from = from.trim();
    to = to.trim();

    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    const formats = start = ['DD MMMM HH:mm', 'D MMMM H:m', 'D MM H:m', 'D MM HH:mm',
                             'DD MM H:m', 'DD MM HH:mm',
                             'DD M HH:mm', 'D M HH:mm', 'D M H:m', 'DD M H:m'];
    let start = moment(from, formats, true);
    let end = moment(to, formats, true);
    if (!start.isValid()) {
      start = moment(humanDate(from));
    }
    if (!end.isValid()) {
      end = moment(humanDate(to, message.preformatted.includes('for') ? start : new Date()));
      if (end < start) end = moment(humanDate(to, start));
    }

    const employee = await findEmployee(uri, bot, message, username);
    const startWorkhour = await get(`employee/${employee.id}/workhour`, {
      weekday: start.day(),
      include: 'Timerange'
    });
    const endWorkhour = await get(`employee/${employee.id}/workhour`, {
      weekday: end.day(),
      include: 'Timerange'
    });

    if (!startWorkhour) {
      message.reply(`You don't have a working hour on *${from}*: *${start.format('dddd')}*.`);
      return;
    }
    if (!endWorkhour) {
      message.reply(`You don't have a working hour on *${to}*: *${end.format('dddd')}*.`);
      return;
    }

    const startTimerange = moment(startWorkhour.Timeranges[0].start, 'HH:mm')
                            .year(start.year())
                            .dayOfYear(start.dayOfYear());
    const endTimerange = moment(endWorkhour.Timeranges[0].end, 'HH:mm')
                            .year(end.year())
                            .dayOfYear(end.dayOfYear());

    start = moment.max(start, startTimerange);
    end = moment.min(end, endTimerange);

    const data = { start: start.toISOString(), end: end.toISOString(), reason };
    const b = await post(`employee/${employee.id}/break`, data);

    const userinfo = `${employee.firstname} ${employee.lastname}`;
    const formattedFrom = start.format('DD MMMM HH:mm');
    const formattedTo = end.format('DD MMMM HH:mm');
    const manager = bot.config.teamline.vacations.manager;

    const details = `(#${b.id}) from *${formattedFrom}* to *${formattedTo}*`;
    message.reply(`Your request for a vacation ${details} is submitted!`);

    setTimeout(async () => {
      const stillThere = await get(`break/${b.id}`);
      if (!stillThere) return;

      const approved = await bot.ask(manager, `Hey, ${userinfo} wants to go on a vacation ` + //eslint-disable-line
                                             `from ${formattedFrom} to ${formattedTo}.\n` +
                                             (reason ? `Reason: ${reason}` : ``) +
                                             `Do you grant the permission?`, Boolean);

      if (approved) {
        message.reply(`Alright, your vacation request ${details} was accepted. Have fun! ⛱`);
        await put(`break/${b.id}`, { status: 'accepted' });
      } else {
        message.reply(`Your vacation request ${details} was rejected. 😟`);
        await put(`break/${b.id}`, { status: 'rejected' });
      }
    }, 1000 * 30);
  });

  bot.command('vacations [char] [string]', async message => {
    const [username, daterange] = message.match;

    const range = (daterange || '').split('to').filter(a => a).map(a => moment(humanDate(a)));
    if (range.length === 1) {
      range.push(moment().hours(0).minutes(0).seconds(0));
    } else if (range.length === 0) {
      range.push(moment().subtract(1, 'week').hours(0).minutes(0).seconds(0));
      range.push(moment().add(1, 'day').hours(0).minutes(0).seconds(0));
    }

    const employee = await findEmployee(uri, bot, message, username);
    const breaks = await get(`employee/${employee.id}/breaks`, {
      $or: [
        {
          start: {
            $lt: range[1].toISOString(),
            $gt: range[0].toISOString()
          }
        },
        {
          end: {
            $lt: range[1].toISOString(),
            $gt: range[0].toISOString()
          },
        }
      ]
    });

    const workhours = await get(`employee/${employee.id}/workhours`, {
      include: 'Timerange'
    });

    const name = username ? `${employee.firstname} ${employee.lastname}'s` : 'Your';

    const attachments = Array.from(printBreaks(breaks, workhours));
    await message.reply(`${name} vacations:`, { attachments, websocket: false });
  });

  bot.command('vacation(s)? remove [number]', async message => {
    const [id] = message.match;
    const b = await get(`break/${id}`);

    const manager = bot.config.teamline.vacations.manager;
    if (b.status !== 'pending' && bot.find(message.user).name !== manager) {
      const employee = findEmployee(uri, bot, message);
      message.reply(`I will your request to @${manager}.`);

      const formattedFrom = moment(b.start).format('DD MMMM HH:mm');
      const formattedTo = moment(b.end).format('DD MMMM HH:mm');

      const details = `(#${b.id}) from *${formattedFrom}* to *${formattedTo}*`;
      bot.sendMessage(manager, `Hey, @${employee.name} wants to remove vacation ${details}`);
      return;
    }

    await del(`break/${id}`);

    message.reply(`Removed vacation #${id}`);
  });

  const printBreaks = (list) => {
    const sum = list.reduce((a, b) => {
      const start = moment(b.start);
      const end = moment(b.end);

      const t = end.diff(start, 'minutes', true);

      return a + t;
    }, 0);

    const duration = moment.duration(sum, 'minutes');
    const sumtext = `Sum of vacations: ${parseInt(duration.asHours(), 10)} hours` + // eslint-disable-line
                    (duration.minutes() ? ` and ${duration.minutes()} minutes` : ``);
    const sumAttachment = {
      pretext: sumtext,
      fallback: sumtext
    };

    return list.map(entry => {
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
    }).concat(sumAttachment);
  };
};
