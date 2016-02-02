import { printList, findEmployee, request, fuzzy } from '../utils';
import _ from 'lodash';
import humanDate from 'date.js';

export default async (bot, uri) => {
  bot.command('my <char> [char]', async message => {
    let [type, scope] = message.match;
    type = type.toLowerCase();
    scope = scope || '';

    const employee = await findEmployee(uri, bot, message);

    let items;

    if (type === 'actions' || type === 'roles') {
      scope += '?include=Project';
      items = await request('get', `${uri}/employee/${employee.id}/${type}/${scope}`);
    }

    if (type === 'projects' || type === 'teams') {
      const roles = await request('get', `${uri}/employee/${employee.id}/roles`
                                       + `?include=Project`);

      if (type === 'projects') {
        const projects = _.filter(roles.map(role => role.Project));
        items = _.uniqWith(projects, _.isEqual);
      }
      if (type === 'teams') {
        items = await* roles.map(role =>
          request('get', `${uri}/role/${role.id}/team`)
        );
      }

      items = _.flatten(items);
    }

    message.reply(printList(items));
  });

  bot.command('all <char> [char]', async message => {
    let [type, scope] = message.match;
    type = type.toLowerCase();
    scope = scope || '';

    if (type === 'actions') scope += '?include=Project';
    const list = await request('get', `${uri}/${type}/${scope}`);

    message.reply(printList(list));
  });

  bot.command('todo [char] [string]', async (message) => {
    let [user, date] = message.match; // eslint-disable-line

    if (user === 'myself' || user === 'me') {
      user = null;
    } else {
      user = user.slice(1);
    }

    const from = humanDate(date);
    from.setHours(0);
    from.setMinutes(0);
    from.setSeconds(0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    const employee = await findEmployee(uri, bot, user ? { user } : message);

    const dateQuery = JSON.stringify({
      $gte: +from,
      $lte: +to
    });
    const query = `date=${dateQuery}&include=Project`;
    const url = `${uri}/employee/${employee.id}/actions?${query}`;

    const actions = await request('get', url);

    const placeholder = user ? 'His' : 'Your';
    message.reply(printList(actions, `${placeholder} todo list is empty! 😌`));
  });

  const MIN_SIMILARITY = 0.8;
  bot.command('<todo> [string] > [string]', async message => {
    const projects = await request('get', `${uri}/projects`);
    const projectNames = projects.map(project => project.name);

    const [cmd] = message.match;

    if (!cmd) return;

    const actions = message.preformatted
    .slice(cmd.length + message.preformatted.indexOf(cmd))
    .split('\n')
    .filter(a => a) // filter out empty lines
    .map(a => a.split('>'))
    .map(([project, action]) => [project.trim(), action.trim()])
    .filter(([project, action]) => project && action)
    // Find the most similar project name available, we don't want to bug the user
    .map(([project, action]) => {
      const [distance, index] = fuzzy(project, projectNames);

      if (distance > MIN_SIMILARITY) return [projectNames[index], action];

      // last parameter indicates we have to create the project
      projectNames.push(project);
      return [project, action, true];
    });

    const employee = await findEmployee(uri, bot, message);
    for (const [project, action, create] of actions) {
      let pr;

      if (create) {
        pr = await request('post', `${uri}/project`, null, {
          name: project
        });
      }

      const ac = await request('post', `${uri}/employee/${employee.id}/action`,
                               null, { name: action });
      const encodedProject = encodeURIComponent(project);
      if (!pr) pr = await request('get', `${uri}/project?name=${encodedProject}`);
      await request('get', `${uri}/associate/action/${ac.id}/project/${pr.id}`);

      // await request('get', `${uri}/associate/project/${pr.id}/employee/${employee.id}`);
    }

    // const reply = bot.random('Thank you! 🙏', 'Good luck! ✌️', 'Thanks, have a nice day! 👍');
    // message.reply(reply);

    const url = `${uri}/employee/${employee.id}/actions/today?include=Project`;
    const allActions = await request('get', url);
    const list = printList(allActions);

    message.reply(list);

    const d = new Date();
    if (d.getHours() < 10) return;

    const name = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;

    bot.sendMessage('actions', `${name}\n${list}`, {
      websocket: false,
      parse: 'full'
    });
  });

  bot.command('todo clear', async message => {
    const employee = await findEmployee(uri, bot, message);
    await request('delete', `${uri}/employee/${employee.id}/actions/today`);

    message.reply('Cleared your actions for today.');
  });

  bot.command('todo remove <number>', async message => {
    let [index] = message.match;
    index = parseInt(index, 10) - 1;

    const employee = await findEmployee(uri, bot, message);
    const actions = await request('get', `${uri}/employee/${employee.id}/actions/today`);

    const action = await request('delete', `${uri}/action/${actions[index].id}`);

    message.reply(`Removed action "${action.name}".`);
  });

  // bot.listen(/teamline done (?:#)?(\d+)/i, async message => {
  //   let [id] = message.match;
  //
  //   let employee = await findEmployee(uri, bot, message);
  //
  //   let action = await request('put', `${uri}/employee/${employee.id}/action/${id}`, null, {
  //     done: true
  //   });
  //
  //   const congrats = bot.random('Good job! 👍', 'Thank you! 🙏', 'Unto the next! ✊');
  //   message.reply(`Marked #${action.id} as done. ${congrats}`);
  // });
  //
  // bot.listen(/teamline undone (?:#)?(\d+)/i, async message => {
  //   let [id] = message.match;
  //
  //   let employee = await findEmployee(uri, bot, message);
  //
  //   let action = await request('put', `${uri}/employee/${employee.id}/action/${id}`, null, {
  //     done: false
  //   });
  //
  //   const again = bot.random('There\'s still time!', 'Maybe later.', 'Wanna take a break?');
  //   message.reply(`Marked #${action.id} as undone.`);
  // });
};
