import findEmployee from '../../functions/find-employee';
import request from '../../functions/request';
import updateActionsMessage from '../../functions/update-actions-message';
import logActions from '../../functions/log-actions';

export default (bot, uri) => {
  const { get, del } = request(bot, uri);

  bot.command('^(actions | action) clear', async message => {
    const employee = await findEmployee(uri, bot, message);
    await del(`employee/${employee.id}/actions/today`);

    message.reply(bot.t('teamline.actions.remove.clear'));

    // These are tested in their own tests
    /* istanbul ignore next */
    await updateActionsMessage(bot, uri, employee);
    /* istanbul ignore next */
    await logActions(bot, uri, employee);
  });

  bot.command('^(actions | action) remove <number>', async message => {
    let [index] = message.match;
    index = parseInt(index, 10) - 1;

    const employee = await findEmployee(uri, bot, message);
    const actions = await get(`employee/${employee.id}/actions/today`);

    const action = await del(`action/${actions[index].id}`);

    message.reply(bot.t('teamline.actions.remove.remove', { action: action.name }));

    // These are tested in their own tests
    /* istanbul ignore next */
    await updateActionsMessage(bot, uri, employee);
    /* istanbul ignore next */
    await logActions(bot, uri, employee);
  });
};
