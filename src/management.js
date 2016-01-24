import { findEmployee, request, printList } from './utils';

export default async (bot, uri) => {
  bot.listen(/teamline manage add (\w+) (.*)/i, async message => {
    let [type, name] = message.match;
    type = type.toLowerCase();

    let item = await request('post', `${uri}/${type}`, null, { name });

    message.reply(`Created ${type} #${item.id} - ${item.name}`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage done (\w+) (?:#)?(\d+)/i, async message => {
    let [type, id] = message.match;
    type = type.toLowerCase();

    let item = await request('put', `${uri}/${type}/${id}`, null, {
      done: true
    });

    message.reply(`Marked ${type} #${item.id} as done.`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage undone (\w+) (?:#)?(\d+)/i, async message => {
    let [type, id] = message.match;
    type = type.toLowerCase();

    let item = await request('put', `${uri}/${type}/${id}`, null, {
      done: false
    });

    message.reply(`Marked ${type} #${item.id} as undone.`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage delete (\w+) (?:#)?(\d+)/i, async message => {
    let [type, id] = message.match;
    type = type.toLowerCase();

    let item = await request('delete', `${uri}/${type}/${id}`);

    message.reply(`Deleted ${type} #${id}.`);
  }, {
    permissions: ['admin', 'human-resource']
  });

  bot.listen(/teamline manage connect (\w+) (?:#)?(\d+) (?:with|to|->)?\s?(\w+) (?:#)?(\d+)/i, async message => {
    let [sourceType, sourceId, targetType, targetId] = message.match;
    sourceType = sourceType.toLowerCase();
    targetType = targetType.toLowerCase();

    await request('get', `${uri}/associate/${sourceType}/${sourceId}/${targetType}/${targetId}`);

    message.reply(`Connected ${sourceType} #${sourceId} with ${targetType} #${targetId}`);
  }, {
    permissions: ['admin', 'human-resource']
  })
}
