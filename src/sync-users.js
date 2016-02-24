import request from './request';
import _ from 'lodash';

export default async function sync(bot, uri) {
  const { get, post, put, del } = request(bot, uri);
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

    let employee = await get(`employee?username=${user.name}`);

    if (employee && user.deleted) {
      stats.deleted++;
      del(`employee/${employee.id}`);
      continue;
    }

    if (employee && _.eq(employee, user)) {
      stats.untouched++;
      // await updateRole(employee, user);
      continue;
    }

    if (employee) {
      stats.updated++;
      employee = await put(`employee/${employee.id}`, null, record);
      // await updateRole(employee, user);
      continue;
    }

    stats.created++;
    employee = await post(`employee`, record);
    // await updateRole(employee, user);
  }

  // async function updateRole(employee, user) {
  //   if (!user.profile.title) return;
  //
  //   const roles = await get(`roles`);
  //   const { title } = user.profile;
  //   let role = roles.find(a => a.name.toLowerCase() === title.toLowerCase());
  //   let exists = false;
  //
  //   if (!role) {
  //     role = await post(`role`, {
  //       name: title
  //     });
  //   } else {
  //     exists = await get(`employee/${employee.id}/role`);
  //   }
  //
  //   if (!exists) {
  //     await get(`associate/role/${role.id}/employee/${employee.id}`);
  //   }
  // }
  //
  return stats;
}
