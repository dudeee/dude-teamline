import { request as unboundRequest, findEmployee, getWeekday, clockEmoji } from '../utils';
import { capitalize } from 'lodash';
import humanDate from 'date.js';
import moment from 'moment';

let request;
const printHours = hours => {
  if (!hours.length) {
    return 'Oops! I got nothing to show! 😶';
  }
  let output = (hours.length > 1)
  ? ':timer_clock: Your working hours plan is:\n'
  : `:timer_clock: Your working hours plan for *${hours[0].weekday}* is:\n`;
  output += hours.map((hour, id) =>
    `#${id + 1}- *${capitalize(hour.weekday)}* from ${clockEmoji(hour.start)}` +
    ` *${hour.start}* to ${clockEmoji(hour.end)} *${hour.end}*`).join('\n');
  return output;
};

const setEmployeeWorkhours = async (uri, userId, dayWorkhours) => {
  // delete previous hours
  await request('delete', `${uri}/employee/${userId}/workhours`);
  // set workhours
  return await Promise.all(dayWorkhours.map(async day => {
    const [startHours, startMinutes] = day.start.split(':');
    const start = new Date();
    start.setHours(startHours);
    start.setMinutes(startMinutes || 0);
    start.setSeconds(0);

    const [endHours, endMinutes] = day.end.split(':');
    const end = new Date();
    end.setHours(endHours);
    end.setMinutes(endMinutes || 0);
    end.setSeconds(0);

    const timeFormat = 'HH:mm:ss';

    return await request('post', `${uri}/employee/${userId}/workhour`, null, {
      weekday: day.day,
      start: moment(start).format(timeFormat),
      end: moment(end).format(timeFormat)
    });
  }));
};

export default async (bot, uri) => {
  request = unboundRequest.bind(bot);

  bot.listen(/^(?:workhours?|wh)\s?(?!.*\b(set)\b)(.+)?$/i, async message => {
    const [, time] = message.match;
    const employee = await findEmployee(uri, bot, message);

    let workHours;
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    if (weekdays.includes(time)) {
      workHours = await request('get', `${uri}/employee/${employee.id}` +
      `/workhours?weekday=${time}`);
      return message.reply(printHours(workHours));
    }

    if (!time) {
      workHours = await request('get', `${uri}/employee/${employee.id}/workhours`);
      return message.reply(printHours(workHours));
    }

    try {
      const date = humanDate(time);
      if (date instanceof Date) {
        const weekday = getWeekday(date);
        workHours = await request('get', `${uri}/employee/${employee.id}` +
        `/workhours?weekday=${weekday}`);
        return message.reply(printHours(workHours));
      }
    } catch (e) {
      bot.log.verbose(e);
      return message.reply(`I didn't understand what you mean by "${time}"`);
    }
  });

  bot.listen(/(?:workhours?|wh)\s(?:set)\s(.+)((?:\n.+)*)/i, async message => { // eslint-disable-line
    let [usernames, data] = message.match;
    const weeekdayHoursRegex = /((sun|sat|mon|tue|wed|thu|fri)\s(.*)\n*)/gi;
    if (!weeekdayHoursRegex.test(data)) {
      return message.reply('Invalid weekdays or hours format.');
    }
    // weekday - workhours per item, remove empty ones
    data = data.split('\n').filter(item => !!item);
    const invalidDays = [];
    const days = [];
    for (const dayWorkhour of data) {
      const checkDayRegex = /(sun|sat|mon|tue|wed|thu|fri)\s(?:((\d{1,2})|(\d{1,2}:\d{1,2}))\s?(?:-|to|\s|,))\s?(?:((\d{1,2}:\d{1,2})|(\d{1,2})))/gi; // eslint-disable-line
      if (checkDayRegex.test(dayWorkhour)) {
        // JS regex problem: http://stackoverflow.com/questions/4724701/regexp-exec-returns-null-sporadically
        const cdr = /(sun|sat|mon|tue|wed|thu|fri)\s(?:((\d{1,2})|(\d{1,2}:\d{1,2}))\s?(?:-|to|\s|,))\s?(?:((\d{1,2}:\d{1,2})|(\d{1,2})))/gi; // eslint-disable-line
        const result = cdr.exec(dayWorkhour);
        // group 2,3 matches only hour formats (8 - 16)
        // group 4,5 matches hour and minutes format (8:30 - 16:50)
        days.push({
          day: result[1],
          start: result[4] || result[2],
          end: result[5] || result[3]
        });
      } else {
        invalidDays.push(dayWorkhour);
      }
    }
    usernames = usernames.replace(/(?:@|\s)/gi, '').split(',');
    const invalidUsers = [];
    const users = [];
    let usersMsg = '';
    let invalidUsersMsg = '';
    let daysMsg = '';
    let invalidDaysMsg = '';
    for (const username of usernames) {
      const user = await request('get', `${uri}/employee?username=${username}`);
      if (user) {
        users.push(user);
        await setEmployeeWorkhours(uri, user.id, days);
      } else {
        invalidUsers.push(username);
      }
    }

    // print valid users
    if (users.length) {
      usersMsg = `

:white_check_mark: The following users workhours are changed:
`;
      usersMsg += users.reduce((prev, curr, currIndex) => {
        if (currIndex - 1 === users.length) {
          return `${prev} and @${curr.username}.

`;
        }
        if (currIndex === 0) {
          return `@${curr.username}`;
        }
        return `${prev}, @${curr.username}`;
      }, usersMsg);
    }

    // print invalid users
    if (invalidUsers.length) {
      invalidUsersMsg += `

:no_entry: The following usernames are invalid:
`;
      invalidUsersMsg += invalidUsers.reduce((prev, curr, currIndex) => {
        if (currIndex - 1 === invalidUsers.length) {
          return `${prev} and ${curr}.

`;
        }
        if (currIndex === 0) {
          return `${curr}`;
        }
        return `${prev}, ${curr}`;
      }, invalidUsersMsg);
    }

    // print valid days
    if (days.length) {
      daysMsg = `

:white_check_mark: The following days are changed for the users:
`;
      daysMsg += days.reduce((prev, curr, currIndex) => {
        if (currIndex - 1 === days.length) {
          return `${prev} and ${curr.day}.

`;
        }
        if (currIndex === 0) {
          return `${curr.day}`;
        }
        return `${prev}, ${curr.day}`;
      }, daysMsg);
    }

    // print invalid days
    if (invalidDays.length) {
      invalidDaysMsg += `

:no_entry: The following days or times are invalid:
`;
      invalidDaysMsg += invalidDays.reduce((prev, curr, currIndex) => {
        if (currIndex - 1 === invalidDays.length) {
          return `${prev} and ${curr}.

`;
        }
        if (currIndex === 0) {
          return `${curr}`;
        }
        return `${prev}, ${curr}`;
      }, invalidDaysMsg);
    }

    message.reply(`${usersMsg}${daysMsg}

${invalidUsersMsg}${invalidDaysMsg}`);
  }, {
    permissions: ['admin', 'human-resource']
  });
};
