import moment from 'moment';
import _ from 'lodash';

export default (bot, modification, workhours, names) => {
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const type = modification.type === 'sub' ? 'out' : 'in';
  const start = moment(modification.start);
  const end = moment(modification.end);
  const distance = Math.abs(moment('00:00', 'HH:mm')
                          .diff(start.clone().hours(0).minutes(0).seconds(0), 'days'));
  const duration = Math.abs(end.diff(start, 'hours')) / 24;

  const formatted = {
    start: start.format('HH:mm'),
    end: end.format('HH:mm'),
    date: start.format('dddd D MMMM'),
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
    end: moment(last.end, 'HH:mm').dayOfYear(end.dayOfYear()),
  };

  let message = {
    start: formatted.start,
    end: formatted.end,
    date: formatted.date,
    names,
    reason: modification.reason,
  };
  let messageType = type;

  const startDiff = Math.abs(start.diff(timerange.start, 'minutes'));
  const endDiff = Math.abs(end.diff(timerange.end, 'minutes'));
  const startEndDiff = Math.abs(start.diff(timerange.end, 'minutes'));
  const endStartDiff = Math.abs(end.diff(timerange.start, 'minutes'));

  if (startEndDiff < 5 && type === 'in') {
    messageType = 'leave';
    message = {
      date: end.calendar(moment(), {
        someElse: 'at HH:mm, dddd D MMMM',
      }),
      names,
      reason: modification.reason,
    };
  }

  if (endStartDiff < 5 && type === 'in') {
    messageType = 'arrive';
    message = {
      date: start.calendar(moment(), {
        someElse: 'at HH:mm, dddd D MMMM',
      }),
      names,
      reason: modification.reason,
    };
  }

  if (endDiff < 5 && type === 'out') {
    messageType = 'leave';
    message = {
      date: start.calendar(moment(), {
        someElse: 'at HH:mm, dddd D MMMM',
      }),
      names,
      reason: modification.reason,
    };
  }

  if (startDiff < 30 && type === 'out') {
    messageType = 'arrive';
    message = {
      date: end.calendar(moment(), {
        someElse: 'at HH:mm, dddd D MMMM',
      }),
      names,
      reason: modification.reason,
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
        sameElse: 'dddd D MMMM',
      }),
      names,
      reason: modification.reason,
    };
  }

  if (duration >= 1 && type === 'out') {
    messageType = 'absent_multiday';
    message = {
      start: start.calendar(null, {
        sameDay: '[Today]',
        nextDay: '[Tomorrow]',
        nextWeek: 'dddd',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd',
        sameElse: 'dddd D MMMM',
      }),
      end: end.calendar(null, {
        sameDay: '[Today]',
        nextDay: '[Tomorrow]',
        nextWeek: 'dddd',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd',
        sameElse: 'dddd D MMMM',
      }),
      names,
      reason: modification.reason,
    };
  }

  const text = bot.t(`teamline.schedules.notification.${messageType}`, message);

  return text;
}
