import { printList } from '../../functions/utils';
import findEmployee from '../../functions/find-employee';
import request from '../../functions/request';
import humanDate from 'date.js';

export default (bot, uri) => {
  const { get } = request(bot, uri);

  bot.command('list <char> <char> [char]', async message => {
    let [user, type, scope] = message.match; // eslint-disable-line
    if (scope) {
      [scope, type] = [type, scope];
    } else {
      scope = '';
    }

    if (user === 'all') user = null;

    const employee = user ? await findEmployee(uri, bot, message, user) : null;

    const query = {};

    if (type[type.length - 1] !== 's') type += 's';

    switch (type) {
      case 'projects':
        scope = scope || 'open';
        query.include = 'Team';
        break;
      case 'actions':
        query.include = ['Project', 'Role'];
        break;
      case 'teams':
        scope = scope || 'open';
        if (!user) {
          query.include = 'Employee';
        }
        break;
      case 'roles':
        scope = scope || 'open';
        query.include = 'Team';
        break;
      default: break;
    }

    if (scope) scope = `/${scope}`;
    let list = user ? await get(`employee/${employee.id}/${type}${scope}`, query)
                    : await get(`${type}${scope}`, query);

    if (!list.length) {
      return message.reply(bot.t('dialogs.empty'));
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

      return message.reply(reply || bot.t('dialogs.empty'));
    }

    if (type === 'teams') {
      if (user) {
        list = await Promise.all(list.map(async team => {
          const Employees = await get(`team/${team.id}/employees`);

          return { ...team, Employees };
        }));
      }

      list = await Promise.all(list.map(async team => {
        const Managers = await get(`team/${team.id}/managers`);

        return { ...team, Managers };
      }));

      const reply = list.map(item => {
        const head = `*${item.name}* (${item.Employees.length} employees)`;
        const managers = item.Managers.map(emp =>
          `      · @${emp.username} – ${emp.firstname} ${emp.lastname}`
        ).join('\n');

        const employees = item.Employees.map(emp =>
          `      · @${emp.username} – ${emp.firstname} ${emp.lastname}`
        ).join('\n');

        return `･ ${head}\n  ･ Managers:\n${managers}\n  ･ Employees:\n${employees}`;
      }).join('\n\n');

      return message.reply(reply || bot.t('dialogs.empty'));
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

      return message.reply(reply || bot.t('dialogs.empty'));
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

  bot.listen(/^(?:action(?:s?))\s*(\S*)\s*([^-,]*)?\s*(?:-|,|to)?\s*(.*)?/gi, async message => {
    if (message.preformatted.includes('>')) return;

    let [user, from, to] = message.match; // eslint-disable-line
    if (from) from = from.trim();
    if (to) to = to.trim();

    from = from || 'today';
    to = to || from;

    const employee = await findEmployee(uri, bot, message, user, ['clear', 'remove']);

    const fromDate = humanDate(from);
    fromDate.setHours(0);
    fromDate.setMinutes(0);
    fromDate.setSeconds(0);
    const toDate = humanDate(to);
    toDate.setDate(toDate.getDate() + 1);
    toDate.setHours(0);
    toDate.setMinutes(0);
    toDate.setSeconds(0);

    const query = {
      date: JSON.stringify({
        $gte: +fromDate,
        $lte: +toDate
      }),
      include: ['Project', 'Role']
    };
    const url = `employee/${employee.id}/actions`;
    const actions = (await get(url, query)).filter(action =>
      (action.Role && !action.Role.closed) || (action.Project && action.Project.state !== 'closed')
    );

    const placeholder = user ? 'His' : 'Your';
    message.reply(printList(actions, bot.t('teamline.actions.list.empty', { user: placeholder })));
  });
};
