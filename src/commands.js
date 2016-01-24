import { printList, findEmployee, request, fuzzy } from './utils';
import _ from 'lodash';

export default async (bot, uri) => {
  bot.listen(/teamline my (\w+)\s?(\w+)?/i, async message => {
    let [type, scope] = message.match;
    type = type.toLowerCase();
    scope = scope || '';

    let employee = await findEmployee(uri, bot, message);

    let items;

    if (type === 'actions' || type === 'roles') {
      items = await request('get', `${uri}/employee/${employee.id}/${type}/${scope}`);
    }

    if (type === 'projects' || type === 'teams') {
      let roles = await request('get', `${uri}/employee/${employee.id}/roles`);

      if (type === 'projects')
        items = await* roles.map(role => {
          return request('get', `${uri}/role/${role.id}/project/${scope}`);
        });
      if (type === 'teams')
        items = await* roles.map(role => {
          return request('get', `${uri}/role/${role.id}/team`);
        });

      items = _.flatten(items);
    }

    message.reply(printList(items));
  });

  bot.listen(/teamline all (\w+)\s?(\w+)?/i, async message => {
    let [type, scope] = message.match;
    type = type.toLowerCase();
    scope = scope || '';

    let list = await request('get', `${uri}/${type}/${scope}`);

    message.reply(printList(list));
  });

	const listTodos = async (message) => {
		let employee = await findEmployee(uri, bot, message);
		const actions = await request('get', `${uri}/employee/${employee.id}/actions/today`)

		if (!actions.length) {
	    let congrats = bot.random('Your todo list is empty! ✌️', 'Woohoo! Your todo list is empty! 🎈',
	                              'You know what? You\'re amazing! Your list is empty! 😎', 'Surprise! Nothing to do! ⛱')
			message.reply(congrats);
			return;
		}

		let reply = await* actions.map(async action => {
			let project = await request('get', `${uri}/action/${action.id}/project`);

			if (!project || !action) return Promise.resolve();

			return `${project.name} > ${action.name}`;
		});

		reply = reply.filter(a => a);

		message.reply(reply.join('\n'));
	}

	const MIN_SIMILARITY = 0.3;
	const setTodos = async (message, update) => {
		const projects = await request('get', `${uri}/projects`);
		const projectNames = projects.map(project => project.name);

		let [cmd] = message.match;

		let actions = message.text
		.slice(cmd.length + message.text.indexOf(cmd))
		.split('\n')
		.filter(a => a) // filter out empty lines
		.map(a => a.split('&gt;'))
		.map(([project, action]) => [project.trim(), action.trim()] )
		.filter(([project, action]) => project && action)
    // Find the most similar project name available, we don't want to bug the user
		.map(([project, action]) => {
			let [distance, index] = fuzzy(project, projectNames);

			if (distance > MIN_SIMILARITY) return [ projectNames[index], action ];

			return [ null, action ]
		});

		if (!actions.length) {
			listTodos(message);
			return;
		}

		let employee = await findEmployee(uri, bot, message);

		await request('delete', `${uri}/employee/${employee.id}/actions`);

		let submitted = await* actions.map(async ([project, action]) => {
			if (!project) {
				message.reply(`I'm sorry, but I couldn't find any project called ${project}.`);
				return Promise.resolve();
			}

			let ac = await request('post', `${uri}/employee/${employee.id}/action`, null, { name: action });
			let pr = await request('get', `${uri}/project?name=${project}`);
			await request('get', `${uri}/associate/action/${ac.id}/project/${pr.id}`);
      let employeeRoles = await request('get', `${uri}/employee/${employee.id}/roles`);
      let projectRoles = await request('get', `${uri}/project/${pr.id}/roles`);

      let roles = _.intersectionBy(employeeRoles, projectRoles, 'id');

      if (!roles.length) {
        let roleNames = projectRoles.map(p => p.name);
        const user = bot.find(message.user);
        let [index] = await bot.ask(user.name, `What's your role in project *${pr.name}*?`, roleNames);
        let { id } = projectRoles[index];

        await request('get', `${uri}/associate/role/${id}/employee/${employee.id}`);
      }

			return ac;
		});

		if (update) return;

		message.on('update', updateListener.bind(null, submitted));

		const reply = bot.random('Thank you! 🙏', 'Good luck! ✌️', 'Thanks, have a nice day! 👍');
		message.reply(reply);
	}

	const updateListener = async (submitted, message) => {
		await* submitted.map(action => {
			if (!action) return Promise.resolve();

			return request('delete', `${uri}/action/${action.id}`)
		});

		message.match = /(teamline todo(?:s?))/i.exec(message.text);
		setTodos(message, true);
	}

	bot.listen(/(teamline todo(?:s?))/i, setTodos);


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
}
