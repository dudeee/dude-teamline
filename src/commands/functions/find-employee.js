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
    return message.reply('You are not a registered employee');
  }

  return employee;
};
