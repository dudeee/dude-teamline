import moment from 'moment';
import { printList } from '../../utils';
import request from '../../request';

export default async (bot, uri, employee) => {
  const { get } = request(bot, uri);

  const url = `employee/${employee.id}/actions/today`;
  const allActions = await get(url, { include: 'Project' });
  const allActionsWithRoles = await* allActions.map(action => {
    if (!action.Project) {
      return get(`action/${action.id}`, { include: 'Role' });
    }

    return action;
  });
  const list = printList(allActionsWithRoles);

  const history = await bot.call('channels.history', {
    channel: bot.find('actions').id,
    oldest: moment().hours(0).minutes(0).seconds(0).unix()
  });

  const userinfo = `${employee.firstname} ${employee.lastname}`;

  const empMessage = history.messages.find(a => a.text.startsWith(userinfo));

  const text = `${userinfo}\n${list}`;

  if (empMessage) {
    await bot.updateMessage('actions', empMessage.ts, text, {
      as_user: true
    });
    return true;
  }

  return false;
};
