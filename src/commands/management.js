import request from '../functions/request';

/* istanbul ignore next */
export default async (bot, uri) => {
  const { get, post, put, del } = request(bot, uri);

  bot.listen(/^teamline manage add (\w+) (.*)/i, async message => {
    const [type, name] = message.match;
    const t = type.toLowerCase();

    const item = await post(`${t}`, { name });

    message.reply(`Created ${t} #${item.id} - ${item.name}`);
  }, {
    permissions: ['admin', 'human-resource'],
  });

  bot.listen(/^teamline manage done (\w+) (?:#)?(\d+)/i, async message => {
    const [type, id] = message.match;
    const t = type.toLowerCase();

    const item = await put(`${t}/${id}`, {
      done: true,
    });

    message.reply(`Marked ${type} #${item.id} as done.`);
  }, {
    permissions: ['admin', 'human-resource'],
  });

  bot.listen(/^teamline manage undone (\w+) (?:#)?(\d+)/i, async message => {
    const [type, id] = message.match;
    const t = type.toLowerCase();

    const item = await put(`${t}/${id}`, {
      done: false,
    });

    message.reply(`Marked ${type} #${item.id} as undone.`);
  }, {
    permissions: ['admin', 'human-resource'],
  });

  bot.listen(/^teamline manage delete (\w+) (?:#)?(\d+)/i, async message => {
    const [type, id] = message.match;
    const t = type.toLowerCase();

    const item = await del(`${t}/${id}`);

    message.reply(`Deleted ${type} #${item.id}.`);
  }, {
    permissions: ['admin', 'human-resource'],
  });

  bot.listen(/^teamline manage connect (\w+) (?:#)?(\d+) (?:with|to|->)?\s?(\w+) (?:#)?(\d+)/i, async message => { // eslint-disable-line
    const [st, sourceId, tt, targetId] = message.match;
    const sourceType = st.toLowerCase();
    const targetType = tt.toLowerCase();

    await get(`associate/${sourceType}/${sourceId}/${targetType}/${targetId}`);

    message.reply(`Connected ${sourceType} #${sourceId} with ${targetType} #${targetId}`);
  }, {
    permissions: ['admin', 'human-resource'],
  });

  bot.command('^teamline refresh', async message => {
    get('?refresh');

    message.reply(bot.t('teamline.actions.refresh'));
  });
};
