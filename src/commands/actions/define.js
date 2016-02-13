import { request as unboundRequest, fuzzy, printList, findEmployee } from '../../utils';

export default (bot, uri) => {
  const request = unboundRequest.bind(bot);

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
};
