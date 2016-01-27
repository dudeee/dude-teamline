import { request } from './utils';

export default async (bot, uri) => {
  bot.listen(/teamline manage add (\w+) (.*)/i, async message => {
    const [type, name] = message.match;
    const t = type.toLowerCase();

    const item = await request('post', `${uri}/${t}`, null, { name });

    message.reply(`Created ${t} #${item.id} - ${item.name}`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage done (\w+) (?:#)?(\d+)/i, async message => {
    const [type, id] = message.match;
    const t = type.toLowerCase();

    const item = await request('put', `${uri}/${t}/${id}`, null, {
      done: true
    });

    message.reply(`Marked ${type} #${item.id} as done.`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage undone (\w+) (?:#)?(\d+)/i, async message => {
    const [type, id] = message.match;
    const t = type.toLowerCase();

    const item = await request('put', `${uri}/${t}/${id}`, null, {
      done: false
    });

    message.reply(`Marked ${type} #${item.id} as undone.`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage delete (\w+) (?:#)?(\d+)/i, async message => {
    const [type, id] = message.match;
    const t = type.toLowerCase();

    const item = await request('delete', `${uri}/${t}/${id}`);

    message.reply(`Deleted ${type} #${item.id}.`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage connect (\w+) (?:#)?(\d+) (?:with|to|->)?\s?(\w+) (?:#)?(\d+)/i, async message => { // eslint-disable-line
    const [st, sourceId, tt, targetId] = message.match;
    const sourceType = st.toLowerCase();
    const targetType = tt.toLowerCase();

    await request('get', `${uri}/associate/${sourceType}/${sourceId}/${targetType}/${targetId}`);

    message.reply(`Connected ${sourceType} #${sourceId} with ${targetType} #${targetId}`);
  }, {
    permissions: ['admin', 'human-resource']
  });
};
