import { printList, findEmployee, request, fuzzy } from '../utils';
import humanDate from 'date.js';

export default async (bot, uri) => {
  bot.command('list <char> <char>', async message => {
    let [user, type] = message.match; // eslint-disable-line
    let employee;

    if (user[0] === '@') {
      const username = user.slice(1);
      employee = await request('get', `${uri}/employee?username=${username}`);
    } else if (user === 'myself' || user === 'my' || user === 'me') {
      employee = await findEmployee(uri, bot, message);
    } else {
      user = null;
    }

    let query = '?';

    switch (type) {
      case 'projects':
        type = 'teams';
        query = '?include=Project';
        break;
      case 'actions':
        type = 'projects';
        query = '?include=Action';
        break;
      case 'teams':
        query = '?include=Employee';
        break;
      default: break;
    }

    const list = user ? await request('get', `${uri}/employee/${employee.id}/${type}${query}`)
                      : await request('get', `${uri}/${type}${query}`);

    if (!list.length) {
      return message.reply('Nothing to show 😶');
    }

    if (type === 'projects') {
      const reply = list.map(item => {
        const project = `*${item.name}* (${item.Actions.length} actions)`;

        const actions = item.Actions.filter(action =>
          employee ? action.EmployeeId === employee.id : true
        )
        .map(action =>
          `    · ${action.name}`
        ).join('\n');

        return `･ ${project}\n${actions}`;
      }).join('\n\n');

      return message.reply(reply);
    }

    if (type === 'teams') {
      const reply = list.map(item => {
        const relation = item.Employees || item.Projects;
        const relationName = item.Employees ? 'employees' : 'projects';

        const team = `*${item.name}* (${relation.length} ${relationName})`;

        let subs = '';
        if (item.Employees) {
          subs = item.Employees.map(emp =>
            `    · @${emp.username} – ${emp.firstname} ${emp.lastname}`
          ).join('\n');
        }
        if (item.Projects) {
          subs = item.Projects.map(emp =>
            `    · ${emp.name}`
          ).join('\n');
        }

        return `･ ${team}\n${subs}`;
      }).join('\n\n');

      return message.reply(reply);
    }

    if (type === 'employees') {
      const reply = list.map(item =>
        `@${item.username} – ${item.firstname} ${item.lastname}`
      ).join('\n');

      return message.reply(reply);
    }
  });

  bot.listen(/^actions\s*(\S*)\s*([^-,]*)?\s*(?:-|,)?\s*(.*)?/gi, async message => {
    if (message.preformatted.includes('>')) return;

    let [user, from, to] = message.match; // eslint-disable-line
    if (from) from = from.trim();
    if (to) to = to.trim();

    from = from || 'today';
    to = to || from;

    if (user === 'myself' || user === 'me') {
      user = null;
    } else {
      user = user.slice(1);
    }

    const fromDate = humanDate(from);
    fromDate.setHours(0);
    fromDate.setMinutes(0);
    fromDate.setSeconds(0);
    const toDate = humanDate(to);
    toDate.setDate(toDate.getDate() + 1);
    toDate.setHours(0);
    toDate.setMinutes(0);
    toDate.setSeconds(0);

    const employee = await findEmployee(uri, bot, user ? { user } : message);

    const dateQuery = JSON.stringify({
      $gte: +fromDate,
      $lte: +toDate
    });
    const query = `date=${dateQuery}&include=Project`;
    const url = `${uri}/employee/${employee.id}/actions?${query}`;

    const actions = await request('get', url);

    const placeholder = user ? 'His' : 'Your';
    message.reply(printList(actions, `${placeholder} action list is empty! 😌`));
  });

  const publishActions = bot.config.teamline.schedules['publish-actions'];
  const MIN_SIMILARITY = 0.9;

  const DUPLICATE = 303;
  const NOT_FOUND = 404;
  const NEW = 200;
  bot.command('^<actions> [string] > [string]', async message => {
    const projects = await request('get', `${uri}/projects`);
    const projectNames = projects.map(project => project.name);

    const [cmd] = message.match;

    if (!cmd) return;

    const actions = message.preformatted
    .slice(cmd.length + message.preformatted.indexOf(cmd))
    .split('\n')
    .filter(a => a) // filter out empty lines
    .map(a => a.split('>'))
    .map(([project = '', action = '']) => [project.trim(), action.trim()])
    .filter(([project = '', action = '']) => project && action)
    .map(([project, action]) => {
      // let projectNames;
      // if (team) {
      //   const related = projects.filter(item => item.Team.name === team);
      //   projectNames = related.map(item => item.name);
      // } else {
      //   projectNames = projects.map(item => item.name);
      // }
      const plus = project.startsWith('+');
      if (plus) {
        project = project.slice(1);
      }

    // Find the most similar project name available, we don't want to bug the user
      const [distance, index] = fuzzy(project, projectNames);
      if (distance > MIN_SIMILARITY) {
        if (plus) {
          return [projectNames[index], action, DUPLICATE];
        }

        return [projectNames[index], action];
      }

      if (plus) {
        projectNames.push(project);
        return [project, action, NEW];
      }

      return [project, action, NOT_FOUND];
    });

    const employee = await findEmployee(uri, bot, message);

    let statusMessage = '✅ Submitted your actions successfuly!';

    for (const [project, action, status] of actions) {
      let pr;

      switch (status) {
        case DUPLICATE:
          statusMessage = `⚠️ Project *${project}* already exists. I assumed you `
                        + `meant to add to the already existing project.`;
          break;
        case NOT_FOUND:
          statusMessage = `❓ Project *${project}* doesn't exist, did you mean to`
                        + ` create the project using \`+${project} > ${action}\` ?`;
          continue;
        case NEW:
          pr = await request('post', `${uri}/project`, null, {
            name: project
          });
          break;
        default: break;
      }

      const ac = await request('post', `${uri}/employee/${employee.id}/action`,
                               null, { name: action });
      const encodedProject = encodeURIComponent(project);
      if (!pr) pr = await request('get', `${uri}/project?name=${encodedProject}`);
      await request('get', `${uri}/associate/action/${ac.id}/project/${pr.id}`);

      await request('get', `${uri}/associate/project/${pr.id}/employee/${employee.id}`);
    }

    const url = `${uri}/employee/${employee.id}/actions/today?include=Project`;
    const allActions = await request('get', url);
    const list = printList(allActions);

    message.reply(`${statusMessage}\n\n${list}`);

    const d = new Date();
    const [h, m] = publishActions.split(':');
    if (d.getHours() < +h || d.getMinutes() < +m) return;

    const name = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;

    bot.sendMessage('actions', `${name}\n${list}`, {
      websocket: false,
      parse: 'full'
    });
  });

  bot.command('actions clear', async message => {
    const employee = await findEmployee(uri, bot, message);
    await request('delete', `${uri}/employee/${employee.id}/actions/today`);

    message.reply('Cleared your actions for today.');
  });

  bot.command('actions remove <number>', async message => {
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
