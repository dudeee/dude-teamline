import { request } from './utils';
import _ from 'lodash';

export default async function sync(bot, uri) {
  let stats = {
    created: 0,
    updated: 0,
    deleted: 0,
    untouched: 0
  };

  await* bot.users.map(async user => {
    if (user.is_bot || user.name === 'slackbot') return true;

    let record = {
      username: user.name,
      email: user.profile.email,
      firstname: user.profile.first_name,
      lastname: user.profile.last_name,
      phone: user.profile.phone || null
    };

    let employee = await request('get', `${uri}/employee?username=${user.name}`);

    if (employee && user.deleted) {
      stats.deleted++;
      return request('delete', `${uri}/employee/${employee.id}`);
    }

    if (employee && _.eq(employee, user)) {
      stats.untouched++;
      return true;
    }

    if (employee) {
      stats.updated++;
      return request('put', `${uri}/employee/${employee.id}`, null, record);
    }

    stats.created++;
    return request('post', `${uri}/employee`, null, record);
  });

  return stats;
}
