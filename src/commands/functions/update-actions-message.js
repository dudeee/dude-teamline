import moment from 'moment';
import { printList } from '../../utils';
import request from '../../request';

export default async (bot, uri, employee) => {
  const { get } = request(bot, uri);

  const url = `employee/${employee.id}/actions/today`;
  const allActions = await get(url, { include: ['Project', 'Role'] });
  const list = printList(allActions);

  const history = await bot.call('channels.history', {
    channel: bot.find('actions').id,
    oldest: moment().hours(0).minutes(0).seconds(0).unix()
  });

  const userinfo = `${employee.firstname} ${employee.lastname}`;

  const empMessage = history.messages.find(a => a.text.startsWith(userinfo));

  const text = `${userinfo}\n${list}`;

  if (empMessage) {
    if (!allActions.length) {
      await bot.deleteMessage('actions', empMessage.ts);
      return;
    }
    await bot.updateMessage('actions', empMessage.ts, text, {
      as_user: true
    });
    return;
  }

  if (!allActions.length) return;

  await bot.sendMessage('actions', text, {
    websocket: false,
    links: true,
    parse: 'full',
    as_user: true
  });
  return;
};
