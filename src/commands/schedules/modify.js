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

    const wh = _.find(workhours, { weekday: moment().weekday() }) || { Timeranges: [] };
    const timerange = wh.Timeranges[wh.Timeranges.length - 1];
    const date = parseDate(bot, vdate);

    if (command === 'in') {
      let start;
      let end;
      if (date.range && !date.from.isValid()) {
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
      end.milliseconds(0);
      start.milliseconds(0);

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
      if (!date.range && /from|since/i.test(vdate)) {
        start = date.isValid() ? moment(date) : moment();
        end = moment(timerange.end, 'HH:mm');
      } else if (date.range && !date.from.isValid()) {
        start = moment();
        end = date.to.isValid() ? moment(date.to) : moment(timerange.end, 'HH:mm');
      } else if (date.range) {
        start = moment(date.from);
        end = moment(date.to);
      } else {
        start = moment();
        end = date.isValid() ? moment(date) : moment(timerange.end, 'HH:mm');
      }
      end.milliseconds(0);
      start.milliseconds(0);

      if (command === 'out') {
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
        tend.milliseconds(0);
        shiftEnd.milliseconds(0);
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

    message.reply(`Removed modification from *${start}* until *${end}*.`);
  });
};
