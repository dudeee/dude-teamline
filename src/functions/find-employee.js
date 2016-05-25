import request from './request';

const self = /\b(?:me|my|myself)\b/i;
export default async (uri, bot, message, user, exclude = []) => {
  const { get } = request(bot, uri);
  let employee;
  let username;

  if (user && user.startsWith('(') && user.endsWith(')')) {
    const usernames = user.slice(1, -1).split(',');

    const employees = await Promise.all(usernames.map(u =>
      get('employee', { username: u.trim().replace('@', '') })
    ));

    return employees.filter(a => a);
  }

  if (user && !self.test(user)) {
    username = user.replace('@', '');

    employee = await get('employee', { username });
  } else {
    username = bot.find(message.user).name;
    employee = await get('employee', { username });
  }

  if (!employee) {
    if (!exclude.includes(user.toLowerCase())) {
      if (!user) {
        message.reply(bot.t('teamline.user.not_registered', { username }));
      } else {
        message.reply(bot.t('teamline.user.not_found', { username }));
      }

      throw new Error(`User ${username} not found.`);
    }
  }

  return employee;
};
