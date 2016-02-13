import request from '../../request';

export default async (uri, bot, message) => {
  const { get } = request(bot, uri);
  const username = bot.find(message.user).name;
  const employee = await get('employee', { username });

  if (!employee) {
    return message.reply('You are not a registered employee');
  }

  return employee;
};
