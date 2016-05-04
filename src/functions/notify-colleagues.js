import moment from 'moment';
import _ from 'lodash';
import request from './request';

export default async (bot, uri, modifications, employee) => {
  if (!modifications.length) return false;

  const channel = _.get(bot.config, 'teamline.schedules.notification.channel', 'schedules');
  const enableNotification = _.get(bot.config, 'teamline.schedules.notification.notify', true);
  const { get } = await request(bot, uri);

  let notify;
  try {
    notify = await bot.pocket.get(`schedules.notify.${employee.username}`);
  } catch (e) {
    notify = [];
  }
  const workhours = await get(`employee/${employee.id}/workhours`, {
    include: ['Timerange']
  });
  const names = enableNotification ? notify.map(a => `@${a}`).join(', ') : '';

  modifications.forEach(send);

  function send(modification) {
    const type = modification.type === 'sub' ? 'out' : 'in';
    const start = moment(modification.start);
    const end = moment(modification.end);
    const distance = Math.abs(moment('00:00', 'HH:mm')
                            .diff(start.clone().hours(0).minutes(0).seconds(0), 'days'));

    const formatted = {
      start: start.format('HH:mm'),
      end: end.format('HH:mm'),
      date: start.format('dddd D MMMM')
    };

    if (distance < 7) {
      formatted.start = start.calendar();
      formatted.end = end.calendar();
      formatted.date = '';
    }

    const workhour = _.find(workhours, { weekday: start.weekday() });
    const first = workhour.Timeranges[0];
    const last = workhour.Timeranges[workhour.Timeranges.length - 1];
    const timerange = {
      start: moment(first.start, 'HH:mm').dayOfYear(start.dayOfYear()),
      end: moment(last.end, 'HH:mm').dayOfYear(end.dayOfYear())
    };

    let message = {
      start: formatted.start,
      end: formatted.end,
      date: formatted.date,
      names,
      reason: modification.reason
    };
    let messageType = type;

    const startDiff = Math.abs(start.diff(timerange.start, 'minutes'));
    const endDiff = Math.abs(end.diff(timerange.end, 'minutes'));
    const startEndDiff = Math.abs(start.diff(timerange.end, 'minutes'));

    if (startEndDiff < 5 && type === 'in') {
      messageType = 'leave';
      message = {
        date: end.calendar(moment(), {
          someElse: 'at HH:mm, dddd D MMMM'
        }),
        names,
        reason: modification.reason
      };
    }

    if (endDiff < 5 && type === 'out') {
      messageType = 'leave';
      message = {
        date: start.calendar(moment(), {
          someElse: 'at HH:mm, dddd D MMMM'
        }),
        names,
        reason: modification.reason
      };
    }

    if (startDiff < 30 && type === 'out') {
      messageType = 'arrive';
      message = {
        date: end.calendar(moment(), {
          someElse: 'at HH:mm, dddd D MMMM'
        }),
        names,
        reason: modification.reason
      };
    }

    if (startDiff < 1 && endDiff < 1 && type === 'out') {
      messageType = 'absent';
      message = {
        date: start.calendar(null, {
          sameDay: '[Today]',
          nextDay: '[Tomorrow]',
          nextWeek: 'dddd',
          lastDay: '[Yesterday]',
          lastWeek: '[Last] dddd',
          sameElse: 'dddd D MMMM'
        }),
        names,
        reason: modification.reason
      };
    }

    const text = bot.t(`teamline.schedules.notification.${messageType}`, message);

    bot.sendAsUser(employee.username, channel, text, {
      websocket: false,
      parse: 'full'
    });
  }
};
