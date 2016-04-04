import request from '../../functions/request';
import moment from 'moment';
// import { capitalize, groupBy } from 'lodash';


const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

export default async (bot, uri) => {
  const { get } = request(bot, uri);

  bot.command('^nextseen <string>', async message => {
    let [username] = message.match;
    username = username.replace(/(?:@|\s)/gi, '');
    const employee = await get(`employee?username=${username}`);
    if (!employee) {
      return message.reply(`I didn't find an employee with ${username} username! 😶`);
    }
    const recesses = await get(`employee/${employee.id}/recesses/active`);
    // const workhours = await get(`employee/${employee.id}/recesses`);
    if (recesses.length) {
      const recessEnd = new Date(recesses[0].end);
      return message.reply(`${employee.firstname} ${employee.lastname} ` +
`is currently on the vacation! 😶
You can reach him after ${moment(recessEnd).format(DATE_FORMAT)}`);
    }
    return message.reply(`${employee.firstname} ${employee.lastname} ` +
`should be present at the company, right now! :+1:`);
  });
};
