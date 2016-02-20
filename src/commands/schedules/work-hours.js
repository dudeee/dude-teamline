import { clockEmoji } from '../../utils';
import findEmployee from '../functions/find-employee';
import request from '../../request';
import moment from 'moment';

export default (bot, uri) => {
  const { get, post, del } = request(bot, uri);

  bot.command('^workhours set [char] [string] > [string]', async message => {
    const [username] = message.match;
    const employee = await findEmployee(uri, bot, message, username);

    const { preformatted } = message;
    const listString = preformatted.slice(preformatted.indexOf(username) + username.length);
    const list = parseWorkhoursList(listString);

    for (const item of list) {
      await del(`employee/${employee.id}/workhours`, { weekday: item.day.day() });

      await post(`employee/${employee.id}/workhour`, {
        weekday: item.day.day(),
        start: item.range[0].format('HH:mm'),
        end: item.range[1].format('HH:mm')
      });
    }

    const result = await get(`employee/${employee.id}/workhours`);

    if (!result.length) {
      return message.reply('You have not set your working hours yet.');
    }

    const name = username === 'myself' ? 'Your' : `${employee.firstname}'s`;
    message.reply(`${name} working hours are as follows:\n${printHours(result)}`);
  });

  bot.command('^workhours [char]$', async message => {
    const [username] = message.match;
    const employee = await findEmployee(uri, bot, message, username);

    const result = await get(`employee/${employee.id}/workhours`);


    if (!result.length) {
      return message.reply('You have not set your working hours yet.');
    }

    const name = username ? `${employee.firstname}'s` : 'Your';
    message.reply(`${name} working hours are as follows:\n${printHours(result)}`);
  });

  bot.command('^workhours remove [char] [word]', async message => {
    let [username, day] = message.match;
    if (!day) {
      day = username;
      username = null;
    }
    const employee = await findEmployee(uri, bot, message, username);

    const date = moment(day, 'dddd');

    await del(`employee/${employee.id}/workhours`, { weekday: date.day() });

    message.reply(`Removed your Working Hour for *${date.format('dddd')}*.`);
  });

  const parseWorkhoursList = string =>
    string
      .split('\n')
      .map(a => a.trim())
      .filter(a => a)
      .map(entry => entry.split('>'))
      .map(([day, range]) => {
        const dd = moment(day, 'ddd');
        const r = range.split(/-|to/i).map(date => moment(date, 'H:m'));
        return { day: dd, range: r };
      });

  const printHours = workhours => {
    const list = workhours.map(({ weekday, start, end }) => {
      const day = moment().day(weekday).format('dddd');
      const startClock = clockEmoji(start);
      const endClock = clockEmoji(end);

      return `*${day}* > *${start}* ${startClock} – *${end}* ${endClock}`;
    }).join('\n');

    return list;
  };
};
