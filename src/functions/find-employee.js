import request from './request';

const self = ['me', 'my', 'myself'];
export default async (uri, bot, message, user, exclude = []) => {
  const { get } = request(bot, uri);
  let employee;
  let username;

  if (user && !self.includes(user)) {
    username = user.replace('@', '');

    employee = await get('employee', { username });
  } else {
    username = bot.find(message.user).name;
    employee = await get('employee', { username });
  }

  if (!employee) {
    if (!exclude.includes(user.toLowerCase())) {
      if (!user) {
        message.reply('You are not a registered employee');
      } else {
        message.reply(bot.t('teamline.user.notfound', { username }));
      }

      throw new Error(`User ${username} not found.`);
    }
  }

  return employee;
};
