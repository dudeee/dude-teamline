import findEmployee from '../functions/find-employee';
import workhoursModifications from '../functions/workhours-modifications';
import request from '../../request';
import moment from 'moment';

const DAY_COLORS = ['#687fe0', '#86e453', '#eb5d7a', '#34bae4', '#757f8c', '#ecf76e', '#ac58e0'];
export default (bot, uri) => {
  const { get, post, del } = request(bot, uri);
  const breakTimes = (bot.config.teamline.breaks || []).map(time =>
    ({ start: moment(time.start, 'HH:mm'), end: moment(time.end, 'HH:mm') })
  );

  moment.relativeTimeThreshold('m', 60);
  moment.relativeTimeThreshold('h', Infinity);

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

        const wh = await post(`employee/${emp.id}/workhour`, {
          weekday: item.day.day()
        });

        await Promise.all(item.ranges.map(async range => {
          const tr = await post('timerange', {
            start: range[0].format('HH:mm'),
            end: range[1].format('HH:mm')
          });

          await get(`associate/workhour/${wh.id}/timerange/${tr.id}`);
        }));
      }
    }

    if (!employee) {
      return message.reply('Set working hours successfuly.');
    }

    const result = await get(`employee/${employee.id}/workhours`, { include: 'Timerange' });

    if (!result.length) {
      return message.reply('You have not set your working hours yet.');
    }

    const name = username === 'myself' ? 'Your' : `${employee.firstname}'s`;
    message.reply(`${name} working hours are as follows:`, {
      attachments: printHours(result),
      websocket: false
    });
  }, { permissions: ['human-resource', 'admin'] });

  bot.command('^schedules [char]$', async message => {
    const [username] = message.match;
    const employee = await findEmployee(uri, bot, message, username);

    const result = await get(`employee/${employee.id}/workhours`, { include: 'Timerange' });
    const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`);


    if (!result.length && !modifications.length) {
      return message.reply('You have not set your working hours yet.');
    }

    const name = username ? `${employee.firstname}'s` : 'Your';
    const attachments = printHours(workhoursModifications(result, modifications));
    message.reply(`${name} weekly schedule:`, { attachments, websocket: false });
  });

  bot.command('^schedules remove [char] [word]', async message => {
    let [username, day] = message.match;
    if (!day) {
      day = username;
      username = null;
    }

    const date = moment(day, 'dddd');

    if (username === 'all') {
      await del('workhour', { weekday: date.day() });
      return message.reply(`Cleared everyone's schedule for *${date.format('dddd')}*.`);
    }

    const employee = await findEmployee(uri, bot, message, username);

    await del(`employee/${employee.id}/workhours`, { weekday: date.day() });

    message.reply(`Cleared your schedule for *${date.format('dddd')}*.`);
  }, { permissions: ['human-resource', 'admin'] });

  const parseWorkhoursList = string =>
    string
      .split('\n')
      .map(a => a.trim())
      .filter(a => a)
      .map(entry => entry.split('>'))
      .map(([day, ranges]) => {
        const dd = moment(day, 'ddd');
        const r = ranges.split(',').map(range =>
          range.split(/-|to/i).map(date => moment(date, 'H:m'))
        );
        return { day: dd, ranges: r };
      });

  const printHours = (workhours) => {
    const sorted = workhours.sort((a, b) =>
      a.weekday - b.weekday
    );

    // Weekday starts with Saturday here
    if (sorted[sorted.length - 1].weekday === 6) {
      sorted.unshift(sorted.pop());
    }

    const sum = sorted.reduce((a, b) => {
      const innersum = b.Timeranges.reduce((x, y) => {
        const start = moment(y.start, 'HH:mm');
        const end = moment(y.end, 'HH:mm');

        const breaks = breakTimes.reduce((g, h) => {
          if (start.isSameOrBefore(h.start) && end.isSameOrAfter(h.start) &&
              start.isSameOrBefore(h.end) && end.isSameOrAfter(h.end)) {
            return g + Math.abs(h.end.diff(h.start, 'minutes', true));
          }

          return g;
        }, 0);

        const diff = end.diff(start, 'minutes', true);
        return {
          total: x.total + Math.abs(diff),
          calculated: x.calculated + Math.abs(diff) - breaks,
          breaks: x.breaks + breaks
        };
      }, { total: 0, calculated: 0, breaks: 0 });

      return {
        total: a.total + innersum.total,
        calculated: a.calculated + innersum.calculated,
        breaks: a.breaks + innersum.breaks
      };
    }, { total: 0, calculated: 0, breaks: 0 });

    const list = sorted.map(({ weekday, Timeranges, modified }) => {
      const day = moment().day(weekday).format('dddd');

      return {
        title: (modified ? ':pencil2: ' : '') + day,
        color: DAY_COLORS[weekday],
        fields: Timeranges.reduce((a, t) =>
          a.concat([{
            title: 'From',
            value: moment(t.start, 'HH:mm').format('HH:mm'),
            short: true
          }, {
            title: 'To',
            value: moment(t.end, 'HH:mm').format('HH:mm'),
            short: true
          }])
        , [])
      };
    });

    const textify = s => {
      const duration = moment.duration(s, 'minutes');
      return `${parseInt(duration.asHours(), 10)} hours` + // eslint-disable-line
                        (duration.minutes() ? ` and ${duration.minutes()} minutes` : ``);
    };

    const summary = {
      title: 'Summary',
      fields: [{
        title: 'Total',
        value: textify(sum.total),
        short: true
      }, {
        title: 'Breaks',
        value: textify(sum.breaks),
        short: true
      }, {
        title: 'Calculated',
        value: textify(sum.calculated)
      }]
    };

    list.push(summary);

    return list;
  };
};
