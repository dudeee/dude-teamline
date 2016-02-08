import { printList, findEmployee, request as unboundRequest, fuzzy } from '../utils';
import humanDate from 'date.js';

export default async (bot, uri) => {
  const request = unboundRequest.bind(bot);

  bot.command('list <char> <char> [char]', async message => {
    let [user, type, state] = message.match; // eslint-disable-line
    let employee;

    state = state || '';

    if (user[0] === '@') {
      const username = user.slice(1);
      employee = await request('get', `${uri}/employee?username=${username}`);
    } else if (user === 'myself' || user === 'my' || user === 'me') {
      employee = await findEmployee(uri, bot, message);
    } else {
      user = null;
    }

    let query = '';

    switch (type) {
      case 'projects':
        query = `?include=Team`;
        break;
      case 'actions':
        query = `?include=Project`;
        break;
      case 'teams':
        if (!user) {
          query = `?include=Employee`;
        }
        break;
      case 'roles':
        query = `?include=Team`;
        break;
      default: break;
    }

    let list = user ? await request('get', `${uri}/employee/${employee.id}/${type}${query}`)
                      : await request('get', `${uri}/${type}${query}`);

    if (!list.length) {
      return message.reply('Nothing to show 😶');
    }

    const groupBy = (property) =>
      list.reduce((map, item) => {
        let relation = item[property];
        if (!relation) return map;

        if (!Array.isArray(relation)) {
          relation = [relation];
        }

        for (const record of relation) {
          if (!map[record.name]) {
            map[record.name] = [item];
          } else {
            map[record.name].push(item);
          }
        }

        return map;
      }, {});

    if (type === 'projects') {
      const teams = groupBy('Team');
      const reply = Object.keys(teams).map(key => {
        const item = teams[key];

        if (!item.length) return '';

        const team = `*${key}* (${item.length} projects)`;
        const projects = item.map(project =>
                          `    · ${project.name}`
                        ).join('\n');

        return `･ ${team}\n${projects}`;
      }).join('\n\n');

      return message.reply(reply || 'Nothing to show 😶');
    }

    if (type === 'teams') {
      if (user) {
        list = await Promise.all(list.map(team =>
          request('get', `${uri}/team/${team.id}?include=Employee`)
        ));
      }

      const reply = list.map(item => {
        const head = `*${item.name}* (${item.Employees.length} employees)`;

        const employees = item.Employees.map(emp =>
          `    · @${emp.username} – ${emp.firstname} ${emp.lastname}`
        ).join('\n');

        return `･ ${head}\n${employees}`;
      }).join('\n\n');

      return message.reply(reply || 'Nothing to show 😶');
    }

    if (type === 'roles') {
      const teams = groupBy('Teams');
      const reply = Object.keys(teams).map(key => {
        const team = teams[key];

        const head = `*${key}* (${team.length} roles)`;

        const sub = team.map(role =>
          `    · ${role.name}`
        ).join('\n');

        return `･ ${head}\n${sub}`;
      }).join('\n\n');

      return message.reply(reply || 'Nothing to show 😶');
    }

    if (type === 'actions') {
      const projects = groupBy('Project');
      const reply = Object.keys(projects).map(key => {
        const item = projects[key];

        const team = `*${key}* (${item.length} actions)`;

        const actions = item.map(action =>
          `    · ${action.name}`
        ).join('\n');

        return `･ ${team}\n${actions}`;
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
    const actions = await* (await request('get', url)).map(action => {
      if (!action.Project) {
        return request('get', `${uri}/action/${action.id}?include=Role`);
      }
      return action;
    });

    const placeholder = user ? 'His' : 'Your';
    message.reply(printList(actions, `${placeholder} action list is empty! 😌`));
  });

  const publishActions = bot.config.teamline.schedules['publish-actions'];
  const DISTANCE_REQUIRED = 0.75;

  const DUPLICATE = 303;
  const NOT_FOUND = 404;
  const NEW = 200;
  bot.command('^<actions> [string] > [string] [>] [string]', async message => {
    const projects = await request('get', `${uri}/projects`);
    const projectNames = projects.map(project => project.name);
    const roles = await request('get', `${uri}/roles`);
    const roleNames = roles.map(role => role.name);

    const [cmd] = message.match;

    if (!cmd) return;

    const actions = message.preformatted
    .slice(cmd.length + message.preformatted.indexOf(cmd))
    .split('\n')
    .filter(a => a) // filter out empty lines
    .map(a => a.split('>'))
    .map(([team = '', project = '', action = '']) => [team.trim(), project.trim(), action.trim()])
    .filter(([team = '', project = '']) => team && project)
    .map(([team, project, action]) => {
      if (!action) {
        action = project;
        project = team;
        team = '';
      }
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

      const role = project.startsWith('(') && project.endsWith(')');

      const names = role ? roleNames : projectNames;
      const name = role ? project.slice(1, -1) : project;

      // Find the most similar project name available, we don't want to bug the user
      const [distance, index] = fuzzy(name, names, DISTANCE_REQUIRED);
      if (distance) {
        if (plus) {
          return [team, names[index], action, DUPLICATE, role];
        }

        return [team, names[index], action, null, role];
      }

      if (plus) {
        names.push(name);
        return [team, name, action, NEW, role];
      }

      return [team, name, action, NOT_FOUND, role];
    });

    const employee = await findEmployee(uri, bot, message);

    let statusMessage = '✅ Submitted your actions successfuly!';
    let error = null;

    for (const [team, project, action, status, role] of actions) {
      let pr;
      const name = role ? 'Role' : 'Project';
      const model = name.toLowerCase();

      switch (status) {
        case DUPLICATE:
          if (!error) {
            statusMessage = '';
            error = true;
          }

          statusMessage += `\n⚠️ ${name} *${project}* already exists. I assumed you `
                        + `meant to add to the already existing project.`;
          break;
        case NOT_FOUND:
          if (!error) {
            statusMessage = '';
            error = true;
          }

          const newSyntax = role ? `+(${project})` : `+${project}`;
          statusMessage += `\n❓ ${name} *${project}* doesn't exist, did you mean to`
                        + ` create the ${model} using`
                        + `\`<Team> > ${newSyntax} > ${action}\` ?`;
          continue;
        case NEW:
          pr = await request('post', `${uri}/${name.toLowerCase()}`, null, {
            name: project
          });
          break;
        default: break;
      }

      let ac = await request('get', `${uri}/employee/${employee.id}/action?name=${action}`);
      if (ac) {
        statusMessage += `\n ❗️ Action *${action}* already exists. I assume you accidentaly tried`
                      + ` to add a duplicate action.`;
        continue;
      }

      ac = await request('post', `${uri}/employee/${employee.id}/action`,
                               null, { name: action });
      const encodedName = encodeURIComponent(project);

      let t;
      if (team) {
        t = await request('get', `${uri}/team?name=${encodeURIComponent(team)}`);
      }

      if (!pr) {
        if (t) {
          pr = await request('get', `${uri}/team/${t.id}/${model}?name=${encodedName}`);
        } else {
          pr = await request('get', `${uri}/${model}?name=${encodedName}`);
        }
      }
      if (!t) {
        t = await request('get', `${uri}/${model}/${pr.id}/team`);

        if (!t) continue;
      }

      await request('get', `${uri}/associate/${model}/${pr.id}/team/${t.id}`);

      await request('get', `${uri}/associate/action/${ac.id}/${model}/${pr.id}`);
      await request('get', `${uri}/associate/${model}/${pr.id}/employee/${employee.id}`);
    }

    const url = `${uri}/employee/${employee.id}/actions/today?include=Project`;
    const allActions = await* (await request('get', url)).map(action => {
      if (!action.Project) {
        return request('get', `${uri}/action/${action.id}?include=Role`);
      }

      return action;
    });
    const list = printList(allActions);

    message.reply(`${statusMessage}\n\n${list}`);

    const d = new Date();
    const [h, m] = publishActions.split(':').map(Number.parseFloat);
    if (d.getHours() < h || d.getMinutes() < m) return;

    const name = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;

    bot.sendMessage('actions', `${name}\n${list}`, {
      websocket: false,
      links: true,
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
