import { request as unboundRequest } from '../../utils';

export default (bot, uri) => {
  const request = unboundRequest.bind(bot);

  bot.command('^(actions | action) refresh', async message => {
    request('get', `${uri}?refresh`);

    message.reply('Sent a request to refresh data. 🔄');
  });
};
