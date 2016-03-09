import { printList } from './utils';
import moment from 'moment';
import _ from 'lodash';
import request from '../../request';

export default (bot, uri) => {
  const { get } = request(bot, uri);

  bot.agenda.define('log-actions', async (job, done) => {
    if (moment().hours() < 10) return;

    const teams = await get('teams');
    const head = 'Actions for today! :fist:';

    for (const team of teams) {
      try {
        const name = team.name.replace(/\s/, '-').toLowerCase();
        const projects = await get(`team/${team.id}/projects`, {
          include: 'Action'
        });
        const roles = await get(`team/${team.id}/roles`, {
          include: 'Action'
        });
        roles.forEach(r => r._role = true);
        const both = projects.concat(roles);

        const actions = _.flatten(await Promise.all(both.map(async project => {
          const pr = _.omit(project, 'Actions');
          return Promise.all(project.Actions.map(async a => {
            const action = await get(`action/${a.id}`, { include: 'Employee' });
            const r = pr._role ? { Role: pr } : { Project: pr };
            return { ...r, ...action };
          }));
        })));

        const employees = [];

        const today = moment().hours(0).minutes(0).seconds(0);
        actions.forEach(a => {
          if (moment(a.date) < today) return;
          const emp = a.Employee;

          let target = employees.find(e => e.id === emp.id);
          if (!target) {
            employees.push(emp);
            target = emp;
          }

          target.actions = (target.actions || []).concat(a);
        });

        const list = employees
          .filter(emp => emp.actions.length)
          .map(emp => {
            const actionList = printList(emp.actions);
            return `${emp.firstname} ${emp.lastname}\n${actionList}`;
          }).join('\n\n');

        if (!list.length) continue;

        const text = `${head}\n${list}`;

        const history = await bot.call('channels.history', {
          channel: bot.find(name).id,
          oldest: moment().hours(0).minutes(0).seconds(0).unix()
        });

        let msg = history.messages.find(a => a.text.startsWith(head));

        const channel = bot.find(name).id;

        if (msg) {
          bot.updateMessage(channel, msg.ts, text, {
            as_user: true
          });
        } else {
          msg = await bot.sendMessage(channel, text, {
            websocket: false,
            parse: 'full',
            as_user: true
          });

          if (_.get(bot.config, 'teamline.log.pin')) {
            await bot.call('pins.add', {
              channel,
              timestamp: msg.ts
            });
          }
        }
      } catch (e) {
        //
      }
    }

    done();
  });

  const job = bot.agenda.create('log-actions');
  job.repeatEvery('5 minute');
  job.save();
};
