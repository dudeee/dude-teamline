import { fuzzy, printList } from '../../functions/utils';
import findEmployee from '../../functions/find-employee';
import request from '../../functions/request';
import updateActionsMessage from '../../functions/update-actions-message';
import logActions from '../../functions/log-actions';
import moment from 'moment';

export default (bot, uri) => {
  const { get, post, put } = request(bot, uri);

  const DUPLICATE = Symbol('duplicate');
  const NOT_FOUND = Symbol('not_found');
  const TEAM_NOT_FOUND = Symbol('team_not_found');
  const NEW = Symbol('new');
  bot.command('^<actions | action> [string] > [string] [>] [string]', async message => {
    const t = (key, ...args) => bot.t(`teamline.actions.${key}`, ...args);

    const [cmd] = message.match;

    const actionList = message.preformatted.slice(cmd.length + message.preformatted.indexOf(cmd));

    const employee = await findEmployee(uri, bot, message, null);
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
          continue;
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

      try {
        let tm;
        if (team) {
          tm = await get('team', { name: team, closed: false });
        }
        if (!pr) {
          if (tm) {
            pr = await get(`employee/${employee.id}/${model}`, { name }) ||
                 await get(`team/${tm.id}/${model}`, { name }) ||
                 await get(model, { name });
          } else {
            pr = await get(`employee/${employee.id}/${model}`, { name }) ||
                 await get(model, { name });
          }
        }
        if (tm) {
          await get(`associate/${model}/${pr.id}/team/${tm.id}`);
        }

        // Detect duplicate actions
        let ac = await get(`${model}/${pr.id}/action`, {
          name: action,
          date: {
            $gt: moment().hours(0).minutes(0).seconds(0).toISOString()
          },
          include: ['Role', 'Project']
        });

        if (ac) {
          attachments.danger(t('define.errors.duplicate-action', { action }));
          continue;
        }

        ac = await post(`employee/${employee.id}/action`, { name: action });


        await get(`associate/action/${ac.id}/${model}/${pr.id}`);
        await get(`associate/${model}/${pr.id}/employee/${employee.id}`);
        if (model === 'project') {
          await put(`project/${pr.id}`, {
            state: 'doing'
          });
        }
      } catch (e) {
        bot.log.error('[teamline, define] ERROR', e, e.stack);
      }
    }

    message.reply(list, {
      attachments,
      websocket: false,
      parse: 'full'
    });

    const url = `employee/${employee.id}/actions/today`;
    const allActions = await get(url, { include: ['Project', 'Role'] });
    const list = printList(allActions);

    await updateActionsMessage(bot, uri, employee);
    await logActions(bot, uri, employee);
  });

  async function parseActionList(string, employee) {
    const filter = a => a.Employees.findIndex(e => e.username === employee.username) > -1;

    const projects = await get('projects/open', { include: 'Employee' });
    const relatedProjectNames = projects.filter(filter).map(project => project.name);
    const projectNames = projects.map(project => project.name);
    const roles = await get('roles/open', { include: 'Employee' });
    const relatedRoleNames = roles.filter(filter).map(project => project.name);
    const roleNames = roles.map(role => role.name);
    const teams = await get('teams/open', { include: 'Employee' });
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
            if (relatedDistance === 1) {
              return { team, action, status: DUPLICATE, role, name: names[index] };
            }

            return { team, action, name, status: NEW, role };
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
