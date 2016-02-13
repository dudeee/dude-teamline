import { fuzzy, printList } from '../../utils';
import findEmployee from '../functions/find-employee';
import request from '../../request';

export default (bot, uri) => {
  const { get, post } = request(bot, uri);

  const publishActions = bot.config.teamline.schedules['publish-actions'];
  const DUPLICATE = 303;
  const NOT_FOUND = 404;
  const TEAM_NOT_FOUND = 405;
  const NEW = 200;
  bot.command('^<actions | action> [string] > [string] [>] [string]', async message => {
    const [cmd] = message.match;

    const actionList = message.preformatted.slice(cmd.length + message.preformatted.indexOf(cmd));
    const actions = parseActionList(actionList);

    const employee = await findEmployee(uri, bot, message);

    // Used to indicate errors / warnings / success
    let attachments = [{ text: 'Submitted your actions successfuly!', color: 'good' }];

    for (const { team, action, status, role, name } of actions) {
      let pr;
      const model = name.toLowerCase();
      const modelName = role ? 'Role' : 'Project';

      switch (status) {
        case DUPLICATE:
          attachments.push({
            color: 'warning',
            text: `${modelName} *${name}* already exists. I assumed you meant to add to the ` +
                  `already existing project.`
          });
          break;
        case NOT_FOUND:
          const newSyntax = role ? `+(${name})` : `+${name}`;
          attachments.push({
            color: 'danger',
            text: `${modelName} *${name}* doesn't exist, did you mean to create the ${model} using `
                + `\`Team > ${newSyntax} > ${action}\` ?`
          });
          continue;
        case TEAM_NOT_FOUND:
          attachments.push({
            color: 'danger',
            text: `Team *${team}* doesn't exist.`
          });
          continue;
        case NEW:
          pr = await post(`${name.toLowerCase()}`, { name });
          break;
        default: break;
      }

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

        if ((ac.Project && ac.Project.name === name) ||
            (ac.Role && ac.Role.name === name) &&
            (d === today)) {
          attachments.push({
            color: 'danger',
            text: `Action *${action}* already exists. I assume you accidentaly tried`
                + ` to add a duplicate action.`
          });
          continue;
        }
      } else {
        ac = await post(`employee/${employee.id}/action`, { name: action });
      }

      let t;
      if (team) {
        t = await get('team', { name: team });
      }
      if (!pr) {
        if (t) {
          pr = await get(`team/${t.id}/${model}`, { name });
        } else {
          pr = await get(`${model}`, { name });
        }
      }
      if (!t) {
        t = await get(`${model}/${pr.id}/team`);

        if (!t) continue;
      }

      await get(`associate/${model}/${pr.id}/team/${t.id}`);

      await get(`associate/action/${ac.id}/${model}/${pr.id}`);
      await get(`associate/${model}/${pr.id}/employee/${employee.id}`);
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

    if (!allActionsWithRoles.length) return;

    const d = new Date();
    const [h, m] = publishActions.split(':').map(Number.parseFloat);
    if (d.getHours() < h || d.getMinutes() < m) return;

    const userinfo = `@${employee.username} – ${employee.firstname} ${employee.lastname}`;

    bot.sendMessage('actions', `${userinfo}\n${list}`, {
      websocket: false,
      links: true,
      parse: 'full'
    });
  });


  async function parseActionList(string) {
    const projects = await get('projects');
    const projectNames = projects.map(project => project.name);
    const roles = await get('roles');
    const roleNames = roles.map(role => role.name);
    const teams = await get('teams');
    const teamNames = teams.map(team => team.name);

    const DISTANCE_REQUIRED = 0.8;

    return string.split('\n')
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
            return { team, action, status: DUPLICATE, role, name: names[index] };
          }

          return { team, action, role, name: names[index] };
        }

        if (plus) {
          names.push(name);
          return { team, name, status: NEW, role };
        }

        return { team, name, action, status: NOT_FOUND, role };
      });
  }
};
