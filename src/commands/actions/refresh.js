import request from '../../request';

export default (bot, uri) => {
  const { get } = request(bot, uri);

  bot.command('^(actions | action) refresh', async message => {
    get(`${uri}?refresh`);

    message.reply(bot.t('teamline.actions.refresh'));
  });
};
