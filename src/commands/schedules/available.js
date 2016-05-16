import findEmployee from '../../functions/find-employee';
import workhoursModifications from '../../functions/workhours-modifications';
import parseDate from '../../functions/parse-date';
import request from '../../functions/request';
import moment from 'moment';
import _ from 'lodash';

export default (bot, uri) => {
  const { get } = request(bot, uri);
  const t = (key, ...args) => bot.t(`teamline.schedules.${key}`, ...args);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  bot.command('^available [char] [string]', async message => {
    const [username, vdate] = message.match;
    const employee = await findEmployee(uri, bot, message, username);

    const d = parseDate(bot, vdate);
    const date = d.isValid() ? d : moment();

    const workhours = await get(`employee/${employee.id}/workhours`, {
      weekday: date.weekday(),
      include: 'Timerange'
    });
    const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
      start: {
        $gt: date.clone().hours(0).minutes(0).seconds(0).toISOString()
      },
      end: {
        $lt: date.clone().hours(0).minutes(0).seconds(0).add(1, 'day').toISOString()
      }
    });

    const [computed] = workhoursModifications(bot, workhours, modifications, date);

    if (!computed || !computed.Timeranges.length) {
      message.reply(t('available.not', { date: vdate || 'today' }));
      return;
    }

    const now = computed.Timeranges.some(timerange =>
      moment(timerange.start, 'HH:mm').isSameOrBefore(date) &&
      moment(timerange.end, 'HH:mm').isSameOrAfter(date)
    );

    if (now) {
      message.reply(t('available.now'));
      return;
    }

    const tr = next(computed.Timeranges, date) || nearest(computed.Timeranges, date);

    if (!tr) {
      message.reply(t('available.not', { date: vdate || 'now until tomorrow' }));
      return;
    }

    const start = moment(tr.start, 'HH:mm').format('HH:mm');
    const end = moment(tr.end, 'HH:mm').format('HH:mm');

    message.reply(t('available.range', { start: `*${start}*`, end: `*${end}*` }), {
      websocket: false,
      parse: 'full'
    });
  });
};

const next = (timeranges, target) =>
  timeranges.reduce((a, b) => {
    const diff = moment(b.end, 'HH:mm').dayOfYear(target.dayOfYear()).diff(target);
    if (diff < 0) return a;

    if (!a || diff < a.diff) {
      b.diff = diff;
      return b;
    }
    return a;
  }, null);

const nearest = (timeranges, target) =>
  timeranges.reduce((a, b) => {
    const diff = Math.abs(moment(b.end, 'HH:mm').dayOfYear(target.dayOfYear()).diff(target));

    if (!a || diff < a.diff) {
      b.diff = diff;
      return b;
    }
    return a;
  }, null);
