import moment from 'moment';
import _ from 'lodash';
import request from './request';

export default async (bot, uri, modifications, employee) => {
  if (!modifications.length) return false;

  const channel = _.get(bot.config, 'teamline.schedules.notification.channel') || 'schedules';
  const enableTeams = _.get(bot.config, 'teamline.schedules.notification.mentionTeams') || false;
  const { get } = await request(bot, uri);

  const teams = await get(`employee/${employee.id}/teams/open`);
  const workhours = await get(`employee/${employee.id}/workhours`, {
    include: ['Timerange']
  });
  const names = teams.map(team => `@${team.name.replace(/\s/, '').toLowerCase()}`).join(' ');

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
      teams: enableTeams ? names : [],
      reason: modification.reason
    };
    let messageType = type;

    const startDiff = Math.abs(start.diff(timerange.start, 'minutes'));
    const endDiff = Math.abs(end.diff(timerange.end, 'minutes'));

    if (endDiff < 5) {
      messageType = 'leave';
      message = {
        date: start.calendar(moment(), {
          someElse: 'at HH:mm, dddd D MMMM'
        }),
        teams: enableTeams ? names : [],
        reason: modification.reason
      };
    }

    if (startDiff < 30) {
      messageType = 'arrive';
      message = {
        date: end.calendar(moment(), {
          someElse: 'at HH:mm, dddd D MMMM'
        }),
        teams: enableTeams ? names : [],
        reason: modification.reason
      };
    }

    if (startDiff < 1 && endDiff < 1) {
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
        teams: enableTeams ? names : [],
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
