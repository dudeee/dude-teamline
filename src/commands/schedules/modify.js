import findEmployee from '../../functions/find-employee';
import notifyColleagues from '../../functions/notify-colleagues';
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

  bot.command('^schedules? <char> [string]', async message => { //eslint-disable-line
    const [command, vdate] = message.match;

    if (!(['in', 'out', 'shift'].includes(command))) return;

    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    const employee = await findEmployee(uri, bot, message);
    const workhours = await get(`employee/${employee.id}/workhours`, {
      include: 'Timerange'
    });

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
    let timerange = wh.Timeranges[wh.Timeranges.length - 1];

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
        start = moment(timerange.end, 'HH:mm');
        const duration = moment(date).diff(moment());
        end = date.isValid() ? start.clone().add(duration) : null;
      }

      await post(`employee/${employee.id}/schedulemodification`, {
        type: 'add',
        start: start.toISOString(),
        end: end.toISOString(),
        reason,
        status: 'accepted'
      });

      const formatted = {
        start: start.format('DD MMMM, HH:mm'),
        end: end.format('DD MMMM, HH:mm')
      };
      message.reply(`Okay, I see that you are going to be available from `
                   + `*${formatted.start}* until *${formatted.end}*. :thumbsup:`);
    } else {
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
        start = date.isValid() ? moment(date) : moment(timerange.start, 'HH:mm');

        wh = _.find(workhours, { weekday: start.weekday() }) || { Timeranges: [] };
        timerange = wh.Timeranges[wh.Timeranges.length - 1];
        if (!timerange) {
          message.reply(`You don't have a working hour on ${start.format('DD MMMM')}.`);
          return;
        }

        end = moment(timerange.end, 'HH:mm').dayOfYear(start.dayOfYear());
      }

      if (command === 'out') {
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
        const outModification = {
          type: 'sub',
          start: start.toISOString(),
          end: end.toISOString(),
          reason,
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

        notifyColleagues(bot, uri, [inModification, outModification], employee);
      }
    }
  });

  bot.command('^schedules? undo', async message => {
    // const [id] = message.match;
    const employee = await findEmployee(uri, bot, message);
    const list = await get(`employee/${employee.id}/schedulemodifications`);
    const last = list[list.length - 1];
    const modification = await del(`schedulemodification/${last.id}`);

    const start = moment(modification.start).format('DD MMMM, HH:mm');
    const end = moment(modification.end).format('DD MMMM, HH:mm');

    const channel = _.get(bot.config, 'teamline.schedules.notification.channel') || 'schedules';

    const history = await bot.call('channels.history', {
      channel: bot.find(channel).id,
      oldest: moment().hours(0).minutes(0).seconds(0).unix()
    });

    const msg = _.find(history.messages, { username: employee.username });

    if (msg) {
      await bot.deleteMessage(channel, msg.ts);
    }
    message.reply(`Removed modification from *${start}* until *${end}*.`);
  });
};
