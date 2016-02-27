import findEmployee from '../functions/find-employee';
import request from '../../request';
import moment from 'moment';

const DAY_COLORS = ['#687fe0', '#86e453', '#eb5d7a', '#34bae4', '#757f8c', '#ecf76e', '#ac58e0'];
export default (bot, uri) => {
  const { get, post, del } = request(bot, uri);

  bot.command('^schedules set [char] [string] > [string]', async message => {
    const [username] = message.match;

    let employees = [];
    let employee;
    if (username === 'all' || username === 'default') {
      employees = await get('employees');
    } else {
      employee = await findEmployee(uri, bot, message, username);
      employees = [employee];
    }

    const { preformatted } = message;
    const listString = preformatted.slice(preformatted.indexOf(username) + username.length);
    const list = parseWorkhoursList(listString);

    for (const item of list) {
      for (const emp of employees) {
        await del(`employee/${emp.id}/workhours`, { weekday: item.day.day() });

        await post(`employee/${emp.id}/workhour`, {
          weekday: item.day.day(),
          start: item.range[0].format('HH:mm'),
          end: item.range[1].format('HH:mm')
        });
      }
    }

    if (!employee) {
      return message.reply('Set working hours successfuly.');
    }

    const result = await get(`employee/${employee.id}/workhours`);

    if (!result.length) {
      return message.reply('You have not set your working hours yet.');
    }

    const name = username === 'myself' ? 'Your' : `${employee.firstname}'s`;
    message.reply(`${name} working hours are as follows:`, {
      attachments: printHours(result)
    });
  }, { permissions: ['human-resource', 'admin'] });

  bot.command('^schedules [char]$', async message => {
    const [username] = message.match;
    const employee = await findEmployee(uri, bot, message, username);

    const result = await get(`employee/${employee.id}/workhours`);


    if (!result.length) {
      return message.reply('You have not set your working hours yet.');
    }

    const name = username ? `${employee.firstname}'s` : 'Your';
    const attachments = printHours(result);
    message.reply(`${name} weekly schedule:`, { attachments, websocket: false });
  });

  bot.command('^schedules remove [char] [word]', async message => {
    let [username, day] = message.match;
    if (!day) {
      day = username;
      username = null;
    }

    const date = moment(day, 'dddd');

    if (!username) {
      await del('workhours', { weekday: date.day() });
      return message.reply(`Cleared everyone's schedule for *${date.format('dddd')}*.`);
    }

    const employee = await findEmployee(uri, bot, message, username);

    await del(`employee/${employee.id}/workhours`, { weekday: date.day() });

    message.reply(`Cleared your schedule for *${date.format('dddd')}*.`);
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
    const sorted = workhours.sort((a, b) =>
      a.weekday - b.weekday
    );

    // Weekday starts with Saturday here
    if (sorted[sorted.length - 1].weekday === 6) {
      sorted.unshift(sorted.pop());
    }

    const list = sorted.map(({ weekday, start, end }) => {
      const day = moment().day(weekday).format('dddd');

      return {
        title: day,
        color: DAY_COLORS[weekday],
        fields: [{
          title: 'From',
          value: start,
          short: true
        }, {
          title: 'To',
          value: end,
          short: true
        }]
      };
    });

    return list;
  };
};
