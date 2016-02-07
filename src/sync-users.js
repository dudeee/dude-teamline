import { request as unboundRequest } from './utils';
import _ from 'lodash';

export default async function sync(bot, uri) {
  const request = unboundRequest.bind(bot);
  const stats = {
    created: 0,
    updated: 0,
    deleted: 0,
    untouched: 0
  };

  for (const user of bot.users) {
    if (user.is_bot || user.name === 'slackbot') continue;

    const record = {
      username: user.name,
      email: user.profile.email,
      firstname: user.profile.first_name,
      lastname: user.profile.last_name,
      phone: user.profile.phone || null
    };

    let employee = await request('get', `${uri}/employee?username=${user.name}`);

    if (employee && user.deleted) {
      stats.deleted++;
      request('delete', `${uri}/employee/${employee.id}`);
      continue;
    }

    if (employee && _.eq(employee, user)) {
      stats.untouched++;
      await updateRole(employee, user);
      continue;
    }

    if (employee) {
      stats.updated++;
      employee = await request('put', `${uri}/employee/${employee.id}`, null, record);
      await updateRole(employee, user);
      continue;
    }

    stats.created++;
    employee = await request('post', `${uri}/employee`, null, record);
    await updateRole(employee, user);
  }

  async function updateRole(employee, user) {
    if (!user.profile.title) return;

    const roles = await request('get', `${uri}/roles`);
    const { title } = user.profile;
    let role = roles.find(a => a.name.toLowerCase() === title.toLowerCase());
    let exists = false;

    if (!role) {
      role = await request('post', `${uri}/role`, null, {
        name: title
      });
    } else {
      exists = await request('get', `${uri}/employee/${employee.id}/role`);
    }

    if (!exists) {
      await request('get', `${uri}/associate/role/${role.id}/employee/${employee.id}`);
    }
  }

  return stats;
}
