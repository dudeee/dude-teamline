import moment from 'moment';
import _ from 'lodash';
import request from './request';

export default async (bot, uri, modifications, employee) => {
  const channel = _.get(bot.config, 'teamline.schedules.notification.channel') || 'schedules';
  const enableTeams = _.get(bot.config, 'teamline.schedules.notification.mentionTeams') || false;
  const { get } = await request(bot, uri);

  const teams = await get(`employee/${employee.id}/teams/open`);
  const names = teams.map(team => `@${team.name.replace(/\s/, '').toLowerCase()}`).join(' ');

  const modification = _.find(modifications, { type: 'sub' });
  if (!modification) return false;
  const shiftIn = _.find(modifications, { type: 'add' });
  let inStart;
  let inEnd;
  if (shiftIn) {
    inStart = moment(shiftIn.start);
    inEnd = moment(shiftIn.end);
  }

  const start = moment(modification.start);
  const end = moment(modification.end);
  const duration = end.clone().hours(0).minutes(0).seconds(0)
                      .diff(start.clone().hours(0).minutes(0).seconds(0), 'days');
  //
  // const tomorrow = moment().add(1, 'day').hours(0).minutes(0).seconds(0);
  // const today = moment().hours(0).minutes(0).seconds(0);

  // if (duration <= 1 && start.isAfter(tomorrow)) return false;

  send();
  return true;

  function send() {
    if (shiftIn) {
      shift();
    } else {
      out();
    }
  }

  function out() {
    const formatted = {
      start: start.format('DD MMMM, HH:mm'),
      end: end.format('DD MMMM, HH:mm')
    };

    if (duration < 7) {
      formatted.start = start.calendar();
      formatted.end = end.calendar();
    }

    const text = bot.t('teamline.schedules.notification.out', {
      user: `${employee.username}`,
      start: `*${formatted.start}*`,
      end: `*${formatted.end}*`,
      teams: enableTeams ? names : [],
      reason: modification.reason
    });

    bot.sendAsUser(employee.username, channel, text, {
      websocket: false,
      parse: 'full'
    });
  }

  function shift() {
    const formatted = {
      start: start.format('DD MMMM, HH:mm'),
      end: end.format('DD MMMM, HH:mm'),
      inStart: inStart.format('DD MMMM, HH:mm'),
      inEnd: inEnd.format('DD MMMM, HH:mm')
    };

    if (duration < 7) {
      formatted.start = start.calendar();
      formatted.end = end.calendar();
      formatted.inStart = inStart.calendar();
      formatted.inEnd = inEnd.calendar();
    }

    const text = bot.t('teamline.schedules.notification.shift', {
      user: `${employee.username}`,
      outStart: `*${formatted.start}*`,
      outEnd: `*${formatted.end}*`,
      inStart: `*${formatted.inStart}*`,
      inEnd: `*${formatted.inEnd}*`,
      teams: enableTeams ? names : [],
      reason: modification.reason
    });

    bot.sendAsUser(employee.username, channel, text, {
      websocket: false,
      parse: 'full'
    });
  }
};
