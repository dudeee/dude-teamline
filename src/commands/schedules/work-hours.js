import findEmployee from '../../functions/find-employee';
import workhoursModifications from '../../functions/workhours-modifications';
import request from '../../functions/request';
import moment from 'moment';
import _ from 'lodash';
import parseDate from '../../functions/parse-date';

const DAY_COLORS = ['#687fe0', '#86e453', '#eb5d7a', '#34bae4', '#757f8c', '#ecf76e', '#ac58e0'];
export default (bot, uri) => {
  const { get, post, del } = request(bot, uri);

  moment.relativeTimeThreshold('m', 60);
  moment.relativeTimeThreshold('h', Infinity);

  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const t = (key, ...args) => bot.t(`teamline.schedules.${key}`, ...args);

  bot.command('^(schedules?|sch) set [char] [string] > [string]', async message => {
    const [username] = message.match;

    let employees = [];
    let employee;
    if (username === 'all' || username === 'default' || username === 'everyone') {
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
        try {
          await del(`employee/${emp.id}/workhours`, { weekday: item.day.weekday() });
        } catch (e) {
          //
        }

        if (!item.ranges.length) continue;

        const wh = await post(`employee/${emp.id}/workhour`, {
          weekday: item.day.weekday(),
        });

        await Promise.all(item.ranges.map(async range => {
          await post(`workhour/${wh.id}/timerange`, {
            start: range[0].format('HH:mm'),
            end: range[1].format('HH:mm'),
          });

          // await get(`associate/workhour/${wh.id}/timerange/${tr.id}`);
        }));
      }
    }

    if (!employee) {
      return message.reply(t('workhours.success'));
    }

    const result = await get(`employee/${employee.id}/workhours`, { include: 'Timerange' });

    if (!result.length) {
      return message.reply(t('workhours.clear'));
    }

    const name = username === 'myself' ? 'Your' : `${employee.firstname}'s`;
    message.reply(t('workhours.list_head', { name }), {
      attachments: printHours(result),
      websocket: false,
    });
  }, { permissions: ['human-resource', 'admin'] });

  bot.command('^(schedules?|sch) [char] [string]$', async message => {
    const [username, vdate] = message.match;

    const exclude = ['in', 'out', 'shift', 'undo',
                     'set', 'unset', 'notify', '!notify'];
    if (exclude.includes(username)) return;
    const employee = await findEmployee(uri, bot, message, username, exclude);

    if (vdate.startsWith('monthly')) {
      const d = vdate.replace('monthly', '');
      const date = d ? parseDate(bot, d) || moment().subtract(1, 'month')
                     : moment().subtract(1, 'month');

      let start;
      let end;
      if (date.range) {
        start = date.from.hours(0).minutes(0).seconds(0).milliseconds(0);
        end = date.to.hours(0).minutes(0).seconds(0).milliseconds(0);
      } else {
        start = date.hours(0).minutes(0).seconds(0).milliseconds(0);
        end = start.clone().add(1, 'month');
      }
      console.log('start', start);
      console.log('end', end);

      const attachments = await monthlyReport(employee, start, end);
      message.reply('', { attachments, websocket: false });
      return;
    }

    const date = vdate ? parseDate(bot, vdate) || moment().weekday(0) : moment().weekday(0);
    if (date.range) {
      date.from.hours(0).minutes(0).seconds(0).milliseconds(0);
      date.to.hours(0).minutes(0).seconds(0).milliseconds(0);
    } else {
      date.hours(0).minutes(0).seconds(0).milliseconds(0);
    }

    if (vdate && vdate.includes('week')) {
      if (date.range) {
        date.from.weekday(0);
        date.to.weekday(6);
      } else {
        date.weekday(0);
      }
    }

    if (vdate === 'default') {
      date.from = moment();
      date.to = moment();
    }


    const result = await get(`employee/${employee.id}/workhours`, { include: 'Timerange' });
    const start = (date.range ? date.from : date).clone().hours(0).minutes(0).seconds(0);
    const end = (date.range ? date.to : moment(date).add(1, 'week')).hours(0).minutes(0).seconds(0);

    const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
      start: {
        $gte: start.toISOString(),
      },
      end: {
        $lt: end.toISOString(),
      },
    });

    if (!result.length && !modifications.length) {
      message.reply(t('workhours.not_set'));
      return;
    }

    const name = username ? `${employee.firstname}'s` : 'Your';
    const final = workhoursModifications(bot, result, modifications);
    const attachments = printHours(final);
    message.reply(t('workhours.list_head', { name }), { attachments, websocket: false });
  });

  bot.command('^(schedules?|sch) unset [char] [word]', async message => {
    let [username, day] = message.match;
    if (!day) {
      day = username;
      username = null;
    }

    const date = moment().day(day);

    if (['everyone', 'all'].includes(username)) {
      await del('workhours', { weekday: date.weekday() });
      return message.reply(t('workhours.clear_all_day', { date: date.format('dddd') }));
    }

    const employee = await findEmployee(uri, bot, message, username);

    await del(`employee/${employee.id}/workhours`, { weekday: date.weekday() });

    return message.reply(t('workhours.clear_day', { date: date.format('dddd') }));
  }, { permissions: ['human-resource', 'admin'] });

  const parseWorkhoursList = string =>
    string
      .split('\n')
      .map(a => a.trim())
      .filter(a => a)
      .map(entry => entry.split('>'))
      .map(([day, ranges]) => {
        const dd = moment().day(day);
        const r = ranges.split(',').map(range =>
          range.split(/-|to/i).map(date => moment(date, 'HH:mm'))
        );
        return { day: dd, ranges: r };
      });

  /* istanbul ignore next */
  const printHours = (workhours) => {
    const sorted = workhours.sort((a, b) =>
      a.weekday - b.weekday
    );

    const sum = sorted.reduce((a, b) => {
      const innersum = b.Timeranges.reduce((x, y) => {
        const start = moment(y.start, 'HH:mm');
        const end = moment(y.end, 'HH:mm');

        const diff = end.diff(start, 'minutes', true);
        return x + Math.abs(diff);
      }, 0);

      return a + innersum;
    }, 0);

    const list = sorted.map(({ weekday, Timeranges, modified }) => {
      const day = moment().weekday(weekday).format('dddd');

      return {
        title: (modified ? ':pencil2: ' : '') + day,
        color: DAY_COLORS[weekday],
        fields: Timeranges.reduce((a, tr) =>
          a.concat([{
            title: t('workhours.from'),
            value: moment(tr.start, 'HH:mm').format('HH:mm'),
            short: true,
          }, {
            title: t('workhours.to'),
            value: moment(tr.end, 'HH:mm').format('HH:mm'),
            short: true,
          }])
        , []),
        text: Timeranges.length ? '' : t('workhours.not_available'),
      };
    });

    const summary = {
      title: t('workhours.total'),
      text: textify(sum),
    };

    list.push(summary);

    return list;
  };

  async function monthlyReport(employee, monthStart, monthEnd) {
    try {
      const result = await get(`employee/${employee.id}/workhours`, { include: 'Timerange' });

      let month = [];

      // const monthStart = moment().date(1).hours(0).minutes(0).seconds(0).milliseconds(0);
      // const monthEnd = monthStart.clone().add(1, 'month').subtract(1, 'day');
      // const monthStart = moment().subtract(1, 'month').hours(0).minutes(0).seconds(0).milliseconds(0);
      // const monthEnd = moment().hours(0).minutes(0).seconds(0).milliseconds(0);

      for (let i = 0; i <= Math.floor(30 / 7); i++) {
        const start = monthStart.clone().add(i * 7, 'day');
        const end = moment.min(start.clone().add(1, 'week'), monthEnd);

        const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
          start: {
            $gte: start.toISOString(),
          },
          end: {
            $lt: end.toISOString(),
          },
        });

        const calculated = workhoursModifications(bot, result, modifications);
        calculated.start = start;
        calculated.end = end;
        const absent = calculated.reduce((a, c) =>
          a + (c.Timeranges.length == 0 ? 1 : 0)
        , 0);
        calculated.absent = absent;
        month.push(calculated);
      }

      const attachments = month.map((week, w) => {
        const sum = week.reduce((s, day) => {
          const tsum = day.Timeranges.reduce((ts, tr) => {
            const start = moment(tr.start, 'HH:mm');
            const end = moment(tr.end, 'HH:mm');

            return ts + Math.abs(end.diff(start, 'minutes', true));
          }, 0);

          return s + tsum;
        }, 0);

        return {
          title: `Week ${w + 1}`,
          fields: [{
            title: 'From',
            value: week.start.format('dddd, DD MMMM'),
            short: true,
          }, {
            title: 'To',
            value: week.end.format('dddd, DD MMMM'),
            short: true,
          }, {
            title: 'Working hours',
            value: textify(sum),
            short: true,
          }, {
            title: 'Absent days',
            value: `${week.absent} days`,
            short: true,
          }],
          color: DAY_COLORS[w],
        };
      });

      return attachments;
    } catch (e) {
      console.error(e);
    }
  }

  const textify = s => {
    const duration = moment.duration(s, 'minutes');
    return `${parseInt(duration.asHours(), 10)} hours` + // eslint-disable-line
                      (duration.minutes() ? ` and ${duration.minutes()} minutes` : ``);
  };
};
