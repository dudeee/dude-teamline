import findEmployee from '../functions/find-employee';
import request from '../../request';

export default (bot, uri) => {
  const { get, del } = request(bot, uri);

  bot.command('^(actions | action) clear', async message => {
    const employee = await findEmployee(uri, bot, message);
    await del(`employee/${employee.id}/actions/today`);

    message.reply('Cleared your actions for today.');
  });

  bot.command('^(actions | action) remove <number>', async message => {
    let [index] = message.match;
    index = parseInt(index, 10) - 1;

    const employee = await findEmployee(uri, bot, message);
    const actions = await get(`employee/${employee.id}/actions/today`);

    const action = await del(`action/${actions[index].id}`);

    message.reply(`Removed action *${action.name}*.`);
  });
};