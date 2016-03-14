import findEmployee from '../functions/find-employee';
import parseDate from '../functions/parse-date';
import request from '../../request';
import humanDate from 'date.js';
import moment from 'moment';
import _ from 'lodash';

export default (bot, uri) => {
  const { get, post, put, del } = request(bot, uri);
  const breakTimes = (bot.config.teamline.breaks || []).map(time =>
    ({ start: moment(time.start, 'HH:mm'), end: moment(time.end, 'HH:mm') })
  );

  moment.relativeTimeThreshold('m', 60);
  moment.relativeTimeThreshold('h', Infinity);

  bot.command('^schedule(s)? [char] [char] (from|starting|starting in) <string> to <string>', async message => { //eslint-disable-line
    let [command, username, from, to] = message.match;
    command = command.trim();
    username = username.trim();
    from = from.trim();
    to = to.trim();
    if (!['add', 'sub', 'subtract'].includes(command)) return;
    const type = command === 'add' ? command : 'sub';

    const lines = message.preformatted.split('\n');
    const reason = lines[1] || null;

    let start = parseDate(from);
    let end = parseDate(to);

    const employee = await findEmployee(uri, bot, message, username);

    if (type === 'sub') {
      // Check if the employee has a working day on that day
      const startWorkhour = await get(`employee/${employee.id}/workhour`, {
        weekday: start.day(),
        include: 'Timerange'
      });
      const modifiedStartWorkhour = await get(`employee/${employee.id}/schedulemodification`, {
        start: {
          $gt: start.unix()
        }
      });
      const endWorkhour = await get(`employee/${employee.id}/workhour`, {
        weekday: end.day(),
        include: 'Timerange'
      });
      const modifiedEndWorkhour = await get(`employee/${employee.id}/schedulemodification`, {
        start: {
          $gt: end.unix()
        }
      });

      if (!startWorkhour && !modifiedStartWorkhour) {
        const d = start.format('dddd');
        message.reply(`You don't have a working hour on *${from}*, that's *${d}*.`);
        return;
      }
      if (!endWorkhour && !modifiedEndWorkhour) {
        const d = end.format('dddd');
        message.reply(`You don't have a working hour on *${to}*, that's *${d}*.`);
        return;
      }

      // The start and end cannot exceed employee's workhours on that day
      const startTimerange = moment(startWorkhour.Timeranges[0].start, 'HH:mm')
                              .year(start.year())
                              .dayOfYear(start.dayOfYear());
      const endTimerange = moment(endWorkhour.Timeranges[0].end, 'HH:mm')
                              .year(end.year())
                              .dayOfYear(end.dayOfYear());

      start = moment.max(start, startTimerange);
      end = moment.min(end, endTimerange);
    }

    const data = { type, start: start.toISOString(), end: end.toISOString(), reason };
    const b = await post(`employee/${employee.id}/schedulemodification`, data);

    const userinfo = `${employee.firstname} ${employee.lastname}`;
    const formattedFrom = start.format('DD MMMM HH:mm');
    const formattedTo = end.format('DD MMMM HH:mm');
    const manager = _.get(bot.config, 'teamline.modifications.manager');
    const length = Math.abs(start.diff(end, 'hours', true));
    const details = `(#${b.id}) from *${formattedFrom}* to *${formattedTo}*`;

    const approveLength = _.get(bot.config, 'teamline.modifications.approve-length') || 2;
    if (length < approveLength) {
      await put(`schedulemodification/${b.id}`, { status: 'accepted' });
      message.reply(`Alright, your request ${details} is accepted!`);
      return;
    }

    if (type === 'sub') {
      message.reply(`Your request for a schedule modification ${details} is submitted!`);

      setTimeout(async () => {
        const stillThere = await get(`schedulemodification/${b.id}`);
        if (!stillThere) return;

        const approved = await bot.ask(manager, `Hey, ${userinfo} wants to a ${add} a modification ` + //eslint-disable-line
                                               `from ${formattedFrom} to ${formattedTo}.\n` +
                                               (reason ? `Reason: ${reason}\n` : ``) +
                                               `Do you grant the permission?`, Boolean);

        if (approved) {
          message.reply(`Alright, your modification request ${details} was accepted. Have fun! ⛱`);
          await put(`schedulemodification/${b.id}`, { status: 'accepted' });
        } else {
          message.reply(`Your modification request ${details} was rejected. 😟`);
          await put(`schedulemodification/${b.id}`, { status: 'rejected' });
        }
      }, 1000 * 30);
    } else {
      await put(`schedulemodification/${b.id}`, { status: 'accepted' });
      message.reply(`Alright, your modification request ${details} is accepted. :+1:`);
    }
  });

  bot.command('schedule(s)? modifications [char] [string]', async message => {
    const [username, daterange] = message.match;

    const range = (daterange || '').split(/to|-/).filter(a => a).map(a => moment(humanDate(a)));
    if (range.length === 1) {
      range.push(moment().hours(0).minutes(0).seconds(0));
    } else if (range.length === 0) {
      range.push(moment().subtract(1, 'week').hours(0).minutes(0).seconds(0));
      range.push(moment().add(1, 'week').hours(0).minutes(0).seconds(0));
    }

    const employee = await findEmployee(uri, bot, message, username);
    const schedulemodifications = await get(`employee/${employee.id}/schedulemodifications`, {
      $or: [
        {
          start: {
            $lt: range[1].toISOString(),
            $gt: range[0].toISOString()
          }
        },
        {
          end: {
            $lt: range[1].toISOString(),
            $gt: range[0].toISOString()
          },
        }
      ]
    });

    const workhours = await get(`employee/${employee.id}/workhours`, {
      include: 'Timerange'
    });

    const name = username ? `${employee.firstname} ${employee.lastname}'s` : 'Your';

    const attachments = Array.from(printScheduleModifications(schedulemodifications, workhours));
    await message.reply(`${name} modifications:`, { attachments, websocket: false });
  });

  bot.command('schedule(s)? modifications remove [number]', async message => {
    const [id] = message.match;
    const b = await get(`schedulemodification/${id}`);

    const manager = bot.config.teamline.modifications.manager;
    if (b.status !== 'pending' && bot.find(message.user).name !== manager) {
      const employee = await findEmployee(uri, bot, message);
      message.reply(`I will your request to @${manager}.`);

      const formattedFrom = moment(b.start).format('DD MMMM HH:mm');
      const formattedTo = moment(b.end).format('DD MMMM HH:mm');

      const details = `(#${b.id}) from *${formattedFrom}* to *${formattedTo}*`;
      const answer = await bot.ask(manager,
                                   `Hey, @${employee.username} wants to remove modification ${details}`, //eslint-disable-line
                                   Boolean);
      if (answer) {
        await del(`schedulemodification/${id}`);
        message.reply(`@${manager} approved your remove request. Removed modification #${id}.`);
      }
      return;
    }

    await del(`schedulemodification/${id}`);

    message.reply(`Removed modification #${id}`);
  });

  const printScheduleModifications = (list) => {
    const sum = list.reduce((a, b) => {
      const start = moment(b.start);
      const end = moment(b.end);

      // Calculate intercepting break times
      const breaks = breakTimes.reduce((g, h) => {
        if (start.isSameOrBefore(h.start) && end.isSameOrAfter(h.start) &&
            start.isSameOrBefore(h.end) && end.isSameOrAfter(h.end) &&
            h.type === 'add') {
          const value = Math.abs(h.end.diff(h.start, 'minutes', true));

          return g + value;
        }

        return g;
      }, 0);

      const t = Math.abs(end.diff(start, 'minutes', true));

      const sign = b.type === 'add' ? 1 : -1;

      return {
        total: a.total + (t * sign) - breaks,
        additions: a.additions + (sign === 1 ? t : 0),
        subtractions: a.subtractions + (sign === -1 ? t : 0)
      };
    }, { total: 0, additions: 0, subtractions: 0 });

    const total = moment.duration(sum.total, 'minutes');
    const additions = moment.duration(sum.additions, 'minutes');
    const subtractions = moment.duration(sum.subtractions, 'minutes');

    const sumfallback = `Summary: ${humanizeDuration(total)}`;

    const totalDescription = total.hours() < 0 ? 'substraction' : 'addition';
    const sumAttachment = {
      text: 'Summary',
      fields: [{
        title: 'Additions',
        value: humanizeDuration(additions),
        short: true
      }, {
        title: 'Subtractions',
        value: humanizeDuration(subtractions),
        short: true
      }, {
        title: 'Total',
        value: `${humanizeDuration(total)} of ${totalDescription}`,
        short: true
      }],
      fallback: sumfallback
    };

    return list.map(entry => {
      const format = 'DD MMMM YYYY, HH:mm';

      const fields = [{
        title: 'From',
        value: moment(entry.start).format(format),
        short: true
      }, {
        title: 'To',
        value: moment(entry.end).format(format),
        short: true
      }, {
        title: 'Type',
        value: entry.type === 'add' ? 'Addition' : 'Subtraction',
        short: true
      }];

      if (entry.reason) {
        fields.push({
          title: 'Reason',
          value: entry.reason,
          short: true
        });
      }

      const colors = {
        accepted: 'good',
        pending: 'warning',
        rejected: 'danger'
      };

      const fallback = `${fields[0].title}: *${fields[0].value}*\n` +
                       `${fields[1].title}: *${fields[1].value}*\n`;

      return { color: colors[entry.status], fields, fallback, author_name: `#${entry.id}` };
    }).concat(sumAttachment);
  };
};

const humanizeDuration = duration =>
  `${Math.abs(parseInt(duration.asHours(), 10))} hours` + // eslint-disable-line
  (duration.minutes() ? ` and ${Math.abs(duration.minutes())} minutes` : ``);
