import request from '../../request';

const self = ['me', 'my', 'myself'];
export default async (uri, bot, message, user) => {
  const { get } = request(bot, uri);

  if (user) {
    const username = user.replace('@', '');

    if (!self.includes(username)) {
      return get('employee', { username });
    }
  }

  const username = bot.find(message.user).name;
  const employee = await get('employee', { username });

  if (!employee) {
    if (!user) {
      message.reply('You are not a registered employee');
    } else {
      message.reply(`User ${user} not found.`);
    }

    return null;
  }

  return employee;
};
