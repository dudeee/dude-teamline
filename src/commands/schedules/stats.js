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

    const date = vdate ? parseDate(bot, vdate) || moment().subtract(30, 'day')
                       : moment().subtract(30, 'day');

    const start = (date.range ? date.from : date).clone().hours(0).minutes(0).seconds(0);
    const end = (date.range ? date.to : moment(date).add(30, 'day')).hours(0).minutes(0).seconds(0);

    const username = all.includes(user) ? undefined : username;
    const employees = await get('employees', { username });

    const scores = await Promise.all(employees.map(async employee => {
      const workhours = await get(`employee/${employee.id}/workhours`, {
        include: ['Timerange'],
      });

      const wsum = workhours.reduce((s, a) => {
        const innersum = a.Timeranges.reduce((p, b) => {
          const start = moment(b.start, 'HH:mm');
          const end = moment(b.end, 'HH:mm');
          return p + Math.abs(end.diff(start, 'minutes'));
        }, 0);

        return s + innersum;
      }, 0);

      if (wsum === 0) return { employee, score: 0 };

      const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
        $or: [{
            start: {
              $gte: start.toISOString(),
              $lt: end.toISOString(),
            },
          },
          {
            end: {
              $gte: start.toISOString(),
              $lt: end.toISOString(),
            },
          },
        ],
      });

      const sum = modifications.reduce((s, a) => {
        const diff = Math.abs(moment(a.start).diff(moment(a.end), 'minutes'));

        return s + (a.type === 'sub' ? -diff : diff);
      }, 0);

      const calculated = (sum * 100) / (wsum * 4);
      const score = isNaN(calculated) || Math.abs(calculated) === Infinity ? 0 : calculated;
      return { employee, score };
    }));

    try {
    const ranks = scores.sort((a, b) => a.score - b.score).map(({ score, employee }) => {
      const color = score < 0 ? 'danger' : 'good';
      const h = Math.abs(Math.round(score)) + '%';

      const name = `${employee.firstname} ${employee.lastname}`;

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
};
