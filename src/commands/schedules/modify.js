import findEmployee from '../../functions/find-employee';
import notifyColleagues from '../../functions/notify-colleagues';
import workhoursModifications from '../../functions/workhours-modifications';
import parseDate from '../../functions/parse-date';
import request from '../../functions/request';
import moment from 'moment';
import _ from 'lodash';

export default (bot, uri) => {
  const { get, post, del } = request(bot, uri);
  moment.relativeTimeThreshold('m', 60);
  moment.relativeTimeThreshold('h', Infinity);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  bot.command('^(schedules?)? <in|out|shift> [string]', async message => { //eslint-disable-line
    let [command] = message.match;
    command = command.toLowerCase();
    const line = message.preformatted.split('\n')[0];
    const vdate = line.slice(line.indexOf(command) + command.length + 1).trim();

    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    const employee = await findEmployee(uri, bot, message);
    const whs = await get(`employee/${employee.id}/workhours`, {
      include: 'Timerange'
    });
    const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`);
    const workhours = workhoursModifications(bot, whs, modifications);

    const date = parseDate(bot, vdate);

    let weekday;
    if (date && date.range) {
      weekday = date.from.isValid() ? date.from : date.to;
    } else if (date.isValid()) {
      weekday = date;
    } else {
      weekday = moment();
    }

    let wh = _.find(workhours, { weekday: weekday.weekday() }) || { Timeranges: [] };
    let timerange = nearest(wh.Timeranges, weekday);

    if (command === 'in') {
      let start;
      let end;
      if (date.range && !date.from.isValid() && /\b(?:for)\b/i.test(vdate)) {
        start = moment(timerange.end, 'HH:mm');
        end = date.to.isValid() ? start.clone().add(date.to.diff(moment()))
                                : moment(timerange.end, 'HH:mm');
      } else if (date.range && !date.from.isValid()) {
        start = moment(timerange.end, 'HH:mm');
        end = date.to.isValid() ? moment(date.to) : moment(timerange.end, 'HH:mm');
      } else if (date.range) {
        start = moment(date.from);
        end = moment(date.to);
      } else {
        const bet = between(wh.Timeranges, weekday);
        if (!bet) {
          start = moment();
          const n = next(wh.Timeranges, weekday);
          end = moment(n.start, 'HH:mm').dayOfYear(date.dayOfYear());
        } else {
          start = moment(timerange.end, 'HH:mm');
          const duration = moment(date).diff(moment());
          end = date.isValid() ? start.clone().add(duration) : null;
        }
      }

      const modification = {
        type: 'add',
        start: start.toISOString(),
        end: end.toISOString(),
        reason,
        status: 'accepted'
      };

      await post(`employee/${employee.id}/schedulemodification`, modification);

      const formatted = {
        start: start.format('DD MMMM, HH:mm'),
        end: end.format('DD MMMM, HH:mm')
      };

      message.reply(`Okay, I see that you are going to be available from `
                   + `*${formatted.start}* until *${formatted.end}*. :thumbsup:`);

      notifyColleagues(bot, uri, [modification], employee);
    } else if (command === 'out') {
      if (!timerange) {
        message.reply(`You don't have a working hour on *${weekday.format('dddd')}*.`);
        return;
      }

      let start;
      let end;
      if (!date.range && /\b(?:from|since)\b/i.test(vdate)) {
        start = date.isValid() ? moment(date) : moment();
        end = moment(timerange.end, 'HH:mm').dayOfYear(start.dayOfYear());
      } else if (date.range && !date.from.isValid()) {
        end = date.to.isValid() ? moment(date.to) : moment(timerange.end, 'HH:mm');
        start = moment().dayOfYear(end.dayOfYear());
      } else if (date.range) {
        start = moment(date.from);
        end = moment(date.to);
      } else if (/\b(?:until|til|to)\b/i.test(vdate)) {
        start = moment();
        end = date.isValid() ? moment(date) : moment(timerange.end, 'HH:mm');
      } else if (vdate) {
        start = date.isValid() ? moment(date) : moment(timerange.start, 'HH:mm');

        const startOfDay = moment('00:00', 'HH:mm').dayOfYear(start.dayOfYear());

        if (Math.abs(start.diff(startOfDay)) > 1) { // not a specific day
          start = moment();
          end = moment(date);
        } else {
          wh = _.find(workhours, { weekday: start.weekday() }) || { Timeranges: [] };
          timerange = wh.Timeranges[wh.Timeranges.length - 1];
          if (!timerange) {
            message.reply(`You don't have a working hour on ${start.format('DD MMMM')}.`);
            return;
          }

          end = moment(timerange.end, 'HH:mm').dayOfYear(start.dayOfYear());
        }
      } else { // simplest case, no input
        start = moment();
        end = moment(timerange.end, 'HH:mm');
      }

      const b = moment(wh.Timeranges[0].start, 'HH:mm');
      const beginning = start.clone().hours(b.hours()).minutes(b.minutes());
      start = moment.max(start, beginning);
      const e = moment(timerange.end, 'HH:mm');
      const finish = end.clone().hours(e.hours()).minutes(e.minutes());
      end = moment.min(end, finish);

      const modification = {
        type: 'sub',
        start: start.toISOString(),
        end: end.toISOString(),
        reason,
        status: 'accepted'
      };

      await post(`employee/${employee.id}/schedulemodification`, modification);

      const formatted = {
        start: moment(start).format('DD MMMM, HH:mm'),
        end: moment(end).format('DD MMMM, HH:mm')
      };
      message.reply(`Okay, I see that you are not going to be available from `
                   + `*${formatted.start}* until *${formatted.end}*. :thumbsup:`);

      notifyColleagues(bot, uri, [modification], employee);
    } else if (command === 'shift') {
      let start;
      let end;
      if (!date.range && /\b(?:from|since)\b/i.test(vdate)) {
        start = date.isValid() ? moment(date) : moment();
        end = moment(timerange.end, 'HH:mm').dayOfYear(start.dayOfYear());
      } else if (date.range && !date.from.isValid()) {
        end = date.to.isValid() ? moment(date.to) : moment(timerange.end, 'HH:mm');
        start = moment().dayOfYear(end.dayOfYear());
      } else if (date.range) {
        start = moment(date.from);
        end = moment(date.to);
      } else if (/\b(?:until|til|to)\b/i.test(vdate)) {
        start = moment();
        end = date.isValid() ? moment(date) : moment(timerange.end, 'HH:mm');
      } else {
        start = moment();
        end = date;
      }

      const outModification = {
        type: 'sub',
        start: start.toISOString(),
        end: end.toISOString(),
        reason,
        shift: true,
        status: 'accepted'
      };

      await post(`employee/${employee.id}/schedulemodification`, outModification);

      const tend = moment(timerange.end, 'HH:mm');
      const shiftEnd = tend.clone().add(moment(end).diff(start));
      const inModification = {
        type: 'add',
        start: tend.toISOString(),
        end: shiftEnd.toISOString(),
        reason,
        shift: true,
        status: 'accepted'
      };
      await post(`employee/${employee.id}/schedulemodification`, inModification);

      const unavailable = {
        start: start.format('DD MMMM, HH:mm'),
        end: end.format('DD MMMM, HH:mm')
      };
      const available = {
        start: tend.format('DD MMMM, HH:mm'),
        end: shiftEnd.format('DD MMMM, HH:mm')
      };

      message.reply(`Okay, I see that you are not going to be available from `
                   + `*${unavailable.start}* until *${unavailable.end}*, but you will be available ` // eslint-disable-line
                   + `from *${available.start}* until *${available.end}*. :thumbsup:`);

      notifyColleagues(bot, uri, [outModification, inModification], employee);
    }
  });

  bot.command('^schedules? undo', async message => {
    // const [id] = message.match;
    const employee = await findEmployee(uri, bot, message);
    const list = await get(`employee/${employee.id}/schedulemodifications`);
    const last = list[list.length - 1];
    const modifications = [await del(`schedulemodification/${last.id}`)]; // eslint-disable-line
    if (last.shift) {
      const other = list[list.length - 2];
      modifications.push(await del(`schedulemodification/${other.id}`));
    }

    modifications.forEach(modification => {
      const start = moment(modification.start).format('DD MMMM, HH:mm');
      const end = moment(modification.end).format('DD MMMM, HH:mm');

      message.reply(`Removed modification from *${start}* until *${end}*.`);
    });

    const channel = _.get(bot.config, 'teamline.schedules.notification.channel') || 'schedules';

    const history = await bot.call('channels.history', {
      channel: bot.find(channel).id,
      oldest: moment().hours(0).minutes(0).seconds(0).unix()
    });

    const msg = _.find(history.messages, { username: employee.username });

    if (msg) {
      await bot.deleteMessage(channel, msg.ts);
    }
  });
};

const nearest = (timeranges, target) =>
  timeranges.reduce((a, b) => {
    const diff = moment(b.end, 'HH:mm').dayOfYear(target.dayOfYear()).diff(target);

    if (!a || diff < a.diff) {
      b.diff = diff;
      return b;
    }
  }, null);

const between = (timeranges, target) =>
  timeranges.find(a =>
    moment(a.start, 'HH:mm').isSameOrBefore(target) &&
    moment(a.end, 'HH:mm').isSameOrAfter(target)
  );

const next = (timeranges, target) =>
  timeranges.reduce((a, b) => {
    const diff = moment(b.end, 'HH:mm').dayOfYear(target.dayOfYear()).diff(target);
    if (diff < 0) return a;

    if (!a || diff < a.diff) {
      b.diff = diff;
      return b;
    }
  }, null);
