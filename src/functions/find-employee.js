import request from './request';

const self = /\b(?:me|my|myself)\b/i;
export default async (uri, bot, message, user, exclude = []) => {
  const { get } = request(bot, uri);
  let employee;
  let username;

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
