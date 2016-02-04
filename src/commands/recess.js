import { request, findEmployee } from '../utils';
import humanDate from 'date.js';
import moment from 'moment';
import { capitalize, groupBy } from 'lodash';


const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

const printRecesses = recesses => {
  let output = '';
  output += recesses.map((recess, id) => {
    const startMoment = moment(new Date(recess.start));
    const endMoment = moment(new Date(recess.end));
    return `#${id + 1} - ` +
`for *${moment.duration(startMoment.diff(endMoment)).humanize()}* ` +
`from *${startMoment.format(DATE_FORMAT)}* ` +
`to *${endMoment.format(DATE_FORMAT)}*\n` +
`Status: *${capitalize(recess.status)}*
`;
  }).join('\n');
  return output;
};

const printEmployeeRecesses = recesses => {
  if (!recesses.length) {
    return 'Oops! I got nothing to show! 😶';
  }
  return `:umbrella_on_ground: Your recesses list:

${printRecesses(recesses)}`;
};

const printEmployee = employee => {
  const { firstname, lastname, username } = employee;
  return `${firstname} ${lastname} @${username}`;
};

const printAllRecesses = data => {
  if (!data.length) {
    return 'Oops! I got nothing to show! 😶';
  }
  const recessData = groupBy(data, 'EmployeeId');
  const keys = Object.keys(recessData);

  let output = '';
  for (const id of keys) {
    const item = recessData[id];
    const { Employee: employee } = item[0];
    output += `${printEmployee(employee)}

${printRecesses(item)}

`;
  }
  return output;
};

export default async (bot, uri) => {
  bot.listen(/(?:recess|break)\s(?:(.+)(?:-|_|,))?(.+)(?:to|for|-|_|\.)(.*)/i, async message => {
    const [reason, start, end] = message.match;
    const employee = await findEmployee(uri, bot, message);
    const startDate = humanDate(start);
    const defaultStatus = 'accepted';
    // set offset (second param) to start date
    const endDate = humanDate(end, startDate);
    await request('post', `${uri}/employee/${employee.id}/recess`, null, {
      name: reason ? reason.trim() : 'no reason',
      start: startDate.toString(),
      end: endDate.toString(),
      status: defaultStatus
    });
    const startMoment = moment(startDate);
    const endMoment = moment(endDate);
    message.reply(`Your recess request for ` +
`*${moment.duration(startMoment.diff(endMoment)).humanize()}* ` +
`from *${startMoment.format(DATE_FORMAT)}* ` +
`to *${endMoment.format(DATE_FORMAT)}* ` +
`has been submitted. :+1:`);
  });

  bot.command('^recess$', async message => {
    const employee = await findEmployee(uri, bot, message);
    const recesses = await request('get', `${uri}/employee/${employee.id}/recesses`);
    message.reply(printEmployeeRecesses(recesses));
  });


/**
 * -------------------
 * Management commands
 * -------------------
 */

  bot.listen(/recess\s(?:all|show)(\s(\w+)?\s(.+)|())$/i, async message => {
    const [, key, value] = message.match;
    let recesses = await request('get', `${uri}/recesses?include=Employee`);
    if (key && value) {
      const employeeKeys = ['u', 'e', 'user', 'employee'];
      if (employeeKeys.includes(key)) {
        recesses = recesses.filter(item => {
          const { Employee: emp } = item;
          return (
            emp.username.toLowerCase().indexOf(value) > -1 ||
            emp.firstname.toLowerCase().indexOf(value) > -1 ||
            emp.lastname.toLowerCase().indexOf(value) > -1 ||
            emp.email.toLowerCase().indexOf(value) > -1
          );
        });
      } else {
        recesses = recesses.filter(item => item[key] === value);
      }
    }
    message.reply(printAllRecesses(recesses));
  });

  bot.listen(/recess\s(active|pending|accepted|rejected)$/i, async message => {
    const [scope] = message.match;
    const employee = await findEmployee(uri, bot, message);
    const recesses = await request('get', `${uri}/employee/${employee.id}/recesses/${scope}`);
    message.reply(printEmployeeRecesses(recesses));
  });

  bot.listen(/recess\s(?:all|show)\s(active|pending|accepted|rejected)$/i, async message => {
    const [scope] = message.match;
    const recesses = await request('get', `${uri}/recesses/${scope}?include=Employee`);
    message.reply(printAllRecesses(recesses));
  });
};
