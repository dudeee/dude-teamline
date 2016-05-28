// import findEmployee from '../../functions/find-employee';
// import workhoursModifications from '../../functions/workhours-modifications';
import parseDate from '../../functions/parse-date';
import request from '../../functions/request';
import moment from 'moment';
import _ from 'lodash';

export default (bot, uri) => {
  const { get } = request(bot, uri);
  // const t = (key, ...args) => bot.t(`teamline.schedules.${key}`, ...args);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const all = ['all', 'everyone'];
  bot.command('^(stats?) [char] [string]', async message => {
    const [user, vdate] = message.match;

    const date = vdate ? parseDate(bot, vdate) || moment().subtract(1, 'month')
                       : moment().subtract(1, 'month');

    const start = (date.range ? date.from : date).clone().hours(0).minutes(0).seconds(0);
    const end = (date.range ? date.to : moment(date).add(1, 'week')).hours(0).minutes(0).seconds(0);

    const username = all.includes(user) ? undefined : username;
    const employees = await get('employees', { username });

    const scores = await Promise.all(employees.map(async employee => {
      const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
        start: {
          $gte: start.toISOString(),
        },
        end: {
          $lt: end.toISOString(),
        },
      });

      const sum = modifications.reduce((s, a) => {
        const diff = Math.abs(moment(a.start).diff(moment(a.end), 'minutes'));

        return s + (a.type === 'sub' ? -diff : diff);
      }, 0);

      return sum;
    }));

    try {
    const ranks = scores.sort((a, b) => a - b).map((score, index) => {
      const color = score < 0 ? 'danger' : 'good';
      const h = textify(Math.abs(score));
      const emp = employees[index];
      console.log(emp.username, score)

      const name = `${emp.firstname} ${emp.lastname}`;

      return {
        text: `${name} – ${h}`,
        color,
      };
    });
    message.reply('', { attachments: ranks, websocket: false });
  } catch (e) {
    console.error(e);
  }
  });

  const textify = s => {
    const duration = moment.duration(s, 'minutes');
    return `${parseInt(duration.asHours(), 10)} hours` + // eslint-disable-line
                      (duration.minutes() ? ` and ${duration.minutes()} minutes` : ``);
  };
};
