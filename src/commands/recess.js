import { request, findEmployee } from '../utils';
import humanDate from 'date.js';
import moment from 'moment';
import { capitalize } from 'lodash';


const printRecesses = recesses => {
  if (!recesses.length) {
    return 'Oops! I get nothing to show! 😶';
  }
  let output = ':skier: Your recesses list:\n\n';
  output += recesses.map((recess, id) => {
    const startMoment = moment(new Date(recess.start));
    const endMoment = moment(new Date(recess.end));
    return `#${id + 1} - ` +
`for *${moment.duration(startMoment.diff(endMoment)).humanize()}* ` +
`from *${startMoment.format('dddd, MMMM Do YYYY, h:mm:ss a')}* ` +
`to *${endMoment.format('dddd, MMMM Do YYYY, h:mm:ss a')}*\n` +
`Status: *${capitalize(recess.status)}*
`;
  }).join('\n');
  return output;
};

export default async (bot, uri) => {
  bot.listen(/(?:recess|break)\s(?:(.+)(?:-|_|,))?(.+)(?:to|for|-|_|\.)(.*)/i, async message => {
    // const [start, end] = message.match;
    const [reason, start, end] = message.match;
    const employee = await findEmployee(uri, bot, message);
    const startDate = humanDate(start);
    // set offset (second param) to start date
    const endDate = humanDate(end, startDate);
    await request('post', `${uri}/employee/${employee.id}/recess`, null, {
      name: reason ? reason.trim() : 'no reason',
      start: startDate.toString(),
      end: endDate.toString()
    });
    const startMoment = moment(startDate);
    const endMoment = moment(endDate);
    message.reply(`Your recess request for ` +
`*${moment.duration(startMoment.diff(endMoment)).humanize()}* ` +
`from *${startMoment.format('dddd, MMMM Do YYYY, h:mm:ss a')}* ` +
`to *${endMoment.format('dddd, MMMM Do YYYY, h:mm:ss a')}* ` +
`has been submitted.
I'll inform you about the result as soon as I get it. :speaker::+1:`);
  });

  bot.listen(/^(?:recess|recesses)$/i, async message => {
    const employee = await findEmployee(uri, bot, message);
    const recesses = await request('get', `${uri}/employee/${employee.id}/recesses`);
    message.reply(printRecesses(recesses));
  });
};
