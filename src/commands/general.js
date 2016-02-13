import { printList, findEmployee, request as unboundRequest, fuzzy } from '../utils';
import humanDate from 'date.js';

export default async (bot, uri) => {
  const request = unboundRequest.bind(bot);

  bot.command('^(actions | action) refresh', async message => {
    request('get', `${uri}?refresh`);

    message.reply('Sent a request to refresh data. 🔄');
  });

  const wait = 500;
  bot.command('^(actions | action) help', async message => {
    message.reply(`Hello friend!
I'm Mashti, you might not know me, but you know my grandpa, Friedrich Nietzsche. *⏞*`,
      {
        attachments: [{
          image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Nietzsche187a.jpg/884px-Nietzsche187a.jpg',
          color: '#000000',
          text: 'A moment of silence for my beloved grandpa 😭. Look at his fabulous mustache!',
          fallback: 'A moment of silence for my beloved grandpa 😭. Look at his fabulous mustache!',
          title: 'Friedrich Nietzsche',
          title_link: 'https://en.wikipedia.org/wiki/Friedrich_Nietzsche'
        }],
        websocket: false
      });

    await new Promise(resolve => setTimeout(resolve, wait));

    message.reply(`
Here is an introduction to how I work:

First of all, I know you're all lazy geeks 😪 who moan when told to check their Trello board,
so here's the deal, I have a command called \`list\` which you can use to find anything related to
you. Examples:

\`list my roles\`
\`list my projects\`
\`list all teams\`
\`list all projects\`
\`list @mahdi projects\`
\`list @fattah roles\` _we all know the answer to this one, but let's move on_`);

    await new Promise(resolve => setTimeout(resolve, wait));

    await message.reply(`
Now let's get to action! ⚔

You define your actions using the same syntax you used in mailing list
only with a prefix command \`actions\`, but I'm smarter than you thought,
I will forgive your writing mistakes to some extend.

\`actions some project name > some action\`
\`actions team > project > action\`

To review the list your actions for today, use \`actions\` without any argument.

\`actions\`

My answer looks something like this:
> 1. *Free Money* > Try to play football as much as possible
> 2. *Disturb people* > Talk louder everyday, progress so people won't notice

You can also create projects on the fly, which will then be placed as a card in the
*Homeless Projects* list of your team board, specifying team is mandatory in this case.

\`actions team > +newproject > action\`

You can also define recurring actions for your role,
wrap the role name in parantheses and you are done!

\`actions (role) > action\`
\`actions team > (role) > action\`

You can also clear or remove a specific action using two simple commands:

\`actions clear\`
\`actions remove 1\`
\`actions remove 2\`

All actions associated with a project or role will be placed as a single comment on it's card.
Don't worry, I'm not going to pollute your cards, I will update my last comment.

I think that's it for now, if you have any questions, message @mahdi.
`);
  });

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
        query = `/open?include=Team`;
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

    const groupBy = (...properties) =>
      list.reduce((map, item) => {
        for (const property of properties) {
          let relation = item[property];
          if (!relation) continue;

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
      const projects = groupBy('Project', 'Role');
      const reply = Object.keys(projects).map(key => {
        const item = projects[key];

        const keyDisplay = item.Role ? `(${key})` : key;

        const team = `*${keyDisplay}* (${item.length} actions)`;

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

  bot.listen(/^(?:action(?:s?))\s*(\S*)\s*([^-,]*)?\s*(?:-|,)?\s*(.*)?/gi, async message => {
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

      if (action.Project.state === 'closed') return null;

      return action;
    }).filter(a => a);

    const placeholder = user ? 'His' : 'Your';
    message.reply(printList(actions, `${placeholder} action list is empty! 😌`));
  });

  const publishActions = bot.config.teamline.schedules['publish-actions'];
  const DISTANCE_REQUIRED = 0.8;

  const DUPLICATE = 303;
  const NOT_FOUND = 404;
  const TEAM_NOT_FOUND = 405;
  const NEW = 200;
  bot.command('^<actions | action> [string] > [string] [>] [string]', async message => {
    const projects = await request('get', `${uri}/projects`);
    const projectNames = projects.map(project => project.name);
    const roles = await request('get', `${uri}/roles`);
    const roleNames = roles.map(role => role.name);
    const teams = await request('get', `${uri}/teams`);
    const teamNames = teams.map(team => team.name);

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

      if (team) {
        const [distance, index] = fuzzy(team, teamNames, DISTANCE_REQUIRED);
        if (distance) {
          team = teamNames[index];
        } else {
          return [team, name, action, TEAM_NOT_FOUND, role];
        }
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

    let attachments = [{ text: 'Submitted your actions successfuly!', color: 'good' }];

    for (const [team, project, action, status, role] of actions) {
      let pr;
      const name = role ? 'Role' : 'Project';
      const model = name.toLowerCase();

      switch (status) {
        case DUPLICATE:
          attachments.push({
            color: 'warning',
            text: `${name} *${project}* already exists. I assumed you meant to add to the ` +
                  `already existing project.`
          });
          break;
        case NOT_FOUND:
          const newSyntax = role ? `+(${project})` : `+${project}`;
          attachments.push({
            color: 'danger',
            text: `${name} *${project}* doesn't exist, did you mean to create the ${model} using`
                + `\`<Team> > ${newSyntax} > ${action}\` ?`
          });
          continue;
        case TEAM_NOT_FOUND:
          attachments.push({
            color: 'danger',
            text: `Team *${team}* doesn't exist.`
          });
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
        ac.Role = await request('get', `${uri}/action/${ac.id}/role`);
        ac.Project = await request('get', `${uri}/action/${ac.id}/project`);

        const today = Date.now();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        const d = ac.date;
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);

        if ((ac.Project && ac.Project.name === project) ||
            (ac.Role && ac.Role.name === project) &&
            (d === today)) {
          attachments.push({
            color: 'danger',
            text: `Action *${action}* already exists. I assume you accidentaly tried`
                + ` to add a duplicate action.`
          });
          continue;
        }
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

    if (attachments.length > 1) attachments.splice(0, 1);
    attachments = attachments.map(attachment => {
      attachment.fallback = attachment.text;
      attachment.mrkdwn_in = ['text'];
      return attachment;
    });
    message.reply(`${list}`, {
      websocket: false,
      attachments,
      parse: 'full'
    });

    if (!allActions.length) return;

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

  bot.command('^(actions | action) clear', async message => {
    const employee = await findEmployee(uri, bot, message);
    await request('delete', `${uri}/employee/${employee.id}/actions/today`);

    message.reply('Cleared your actions for today.');
  });

  bot.command('^(actions | action) remove <number>', async message => {
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
