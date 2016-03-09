import { fuzzy, printList } from '../../utils';
import findEmployee from '../functions/find-employee';
import request from '../../request';
import updateActionsMessage from '../functions/update-actions-message';

export default (bot, uri) => {
  const { get, post } = request(bot, uri);

  const DUPLICATE = 303;
  const NOT_FOUND = 404;
  const TEAM_NOT_FOUND = 405;
  const NEW = 200;
  bot.command('^<actions | action> [string] > [string] [>] [string]', async message => {
    const t = (key, ...args) => bot.t(`teamline.actions.${key}`, ...args);

    const [cmd] = message.match;

    const actionList = message.preformatted.slice(cmd.length + message.preformatted.indexOf(cmd));

    const employee = await findEmployee(uri, bot, message);
    const actions = await parseActionList(actionList, employee);
    bot.log.debug('[teamline, define] actions', actions);

    // Used to indicate errors / warnings / success
    const attachments = new bot.Attachments();
    attachments.goodOr(t('define.success'));

    for (const { team, action, status, role, name } of actions) {
      let pr;
      const modelName = role ? 'Role' : 'Project';
      const model = modelName.toLowerCase();

      switch (status) {
        case DUPLICATE:
          attachments.warning(t('define.errors.duplicate-project', { model: modelName, name }));
          break;
        case NOT_FOUND:
          const newSyntax = role ? `+(${name})` : `+${name}`;
          attachments.danger(t('define.errors.notfound', {
            model: modelName, name, action, newSyntax
          }));
          continue;
        case TEAM_NOT_FOUND:
          attachments.danger(t('define.errors.team-notfound', { team }));
          continue;
        case NEW:
          pr = await post(model, { name });
          break;
        default: break;
      }

      // Detect duplicate actions
      let ac = await get(`employee/${employee.id}/action`, { name: action });
      if (ac) {
        ac.Role = await get(`action/${ac.id}/role`);
        ac.Project = await get(`action/${ac.id}/project`);

        const today = new Date();
        today.setHours(0);
        today.setMinutes(0);
        today.setSeconds(0);
        const d = new Date(ac.date);
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);

        const sameRelation = (ac.Project && ac.Project.name === name) ||
                             (ac.Role && ac.Role.name === name);
        if (sameRelation && d === today) {
          attachments.danger(bot.t('define.duplicate-action', { action }));
          continue;
        }
      }

      ac = await post(`employee/${employee.id}/action`, { name: action });

      try {
        let tm;
        if (team) {
          tm = await get('team', { name: team });
        }
        if (!pr) {
          if (tm) {
            pr = await get(`team/${tm.id}/${model}`, { name });

            if (!pr) {
              pr = await get(model, { name });
            }
          } else {
            pr = await get(model, { name });
          }
        }
        if (tm) {
          await get(`associate/${model}/${pr.id}/team/${tm.id}`);
        }

        bot.log.debug('[teamline, debug] action', ac);
        bot.log.debug('[teamline, debug] pr', pr);
        bot.log.debug('[teamline, debug] tm', tm);

        await get(`associate/action/${ac.id}/${model}/${pr.id}`);
        await get(`associate/${model}/${pr.id}/employee/${employee.id}`);
      } catch (e) {
        bot.log.error('[teamline, define] ERROR', e, e.stack);
      }
    }

    const url = `employee/${employee.id}/actions/today`;
    const allActions = await get(url, { include: 'Project' });
    const allActionsWithRoles = await* allActions.map(action => {
      if (!action.Project) {
        return get(`action/${action.id}`, { include: 'Role' });
      }

      return action;
    });
    const list = printList(allActionsWithRoles);

    if (attachments.length > 1) attachments.splice(0, 1);
    message.reply(list, {
      attachments,
      websocket: false,
      parse: 'full'
    });

    const userinfo = `${employee.firstname} ${employee.lastname}`;

    const text = `${userinfo}\n${list}`;

    const updated = await updateActionsMessage(bot, uri, employee);
    if (updated) return;

    bot.sendMessage('actions', text, {
      websocket: false,
      links: true,
      parse: 'full',
      as_user: true
    });
  });

  async function parseActionList(string, employee) {
    const filter = a => a.Employees.findIndex(e => e.username === employee.username) > -1;

    const projects = await get('projects', { include: 'Employee' });
    const relatedProjectNames = projects.filter(filter).map(project => project.name);
    const projectNames = projects.map(project => project.name);
    const roles = await get('roles', { include: 'Employee' });
    const relatedRoleNames = roles.filter(filter).map(project => project.name);
    const roleNames = roles.map(role => role.name);
    const teams = await get('teams', { include: 'Employee' });
    const relatedTeamNames = teams.filter(filter).map(project => project.name);
    const teamNames = teams.map(team => team.name);

    const DISTANCE_REQUIRED = 0.8;

    return string.split('\n')
      .filter(a => a) // filter out empty lines
      .map(a => a.replace(/^actions/, '').split('>'))
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
          const [relatedDistance, relatedIndex] = fuzzy(team, relatedTeamNames, DISTANCE_REQUIRED);
          const [distance, index] = fuzzy(team, teamNames, DISTANCE_REQUIRED);
          if (relatedDistance) {
            team = relatedTeamNames[relatedIndex];
          } else if (distance) {
            team = teamNames[index];
          } else {
            return { team, name, action, status: TEAM_NOT_FOUND, role };
          }
        }

        const role = /\([^)]+\)/.exec(project);

        const names = role ? roleNames : projectNames;
        const relatedNames = role ? relatedRoleNames : relatedProjectNames;
        const name = role ? role[0].slice(1, -1) : project;

        // Find the most similar project name available, we don't want to bug the user
        const [relatedDistance, relatedIndex] = fuzzy(name, relatedNames, DISTANCE_REQUIRED);
        const [distance, index] = fuzzy(name, names, DISTANCE_REQUIRED);
        if (relatedDistance) {
          if (plus) {
            return { team, action, status: DUPLICATE, role, name: names[index] };
          }

          return { team, action, role, name: relatedNames[relatedIndex] };
        }
        if (distance) {
          if (plus) {
            return { team, action, status: DUPLICATE, role, name: names[index] };
          }

          return { team, action, role, name: names[index] };
        }

        if (plus) {
          names.push(name);
          return { team, name, action, status: NEW, role };
        }

        return { team, name, action, status: NOT_FOUND, role };
      });
  }
};
