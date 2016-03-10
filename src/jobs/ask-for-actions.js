import { wait } from '../utils';
import moment from 'moment';
import request from '../request';
import workhoursModifications from '../commands/functions/workhours-modifications';

export default (bot, uri) => {
  const { get } = request(bot, uri);

  bot.agenda.define('ask-for-actions', async (job, done) => {
    const employees = await get('employees');

    const d = moment();
    for (const user of bot.users) {
      const emp = employees.find(a => a.username === user.name);
      if (!emp) continue;
      const notified = await bot.pocket.find('TeamlineNotified', { id: emp.id }).exec();
      if (notified.length) continue;

      const actions = await get(`employee/${emp.id}/actions/today`);
      if (actions.length) continue;

      const modifications = await get(`employee/${emp.id}/schedulemodifications`);
      const rawWorkhours = await get(`employee/${emp.id}/workhour`, {
        weekday: d.day(),
        include: 'Timerange'
      });

      const workhours = workhoursModifications(rawWorkhours, modifications);

      if (!workhours || !workhours.Timeranges.length) continue;

      const firstTimerange = workhours.Timeranges[0];
      const schedule = {
        start: moment(firstTimerange.start, 'HH:mm'),
        end: moment(firstTimerange.end, 'HH:mm')
      };

      const diff = (d.hours() - schedule.start.hours()) * 60
                 + (d.minutes() - schedule.start.minutes());
      if (diff > 0) {
        await bot.sendMessage(user.name, 'Hey! What are you going to do today? 😁');
        const RATE_LIMIT = 1000;
        await wait(RATE_LIMIT);


        const expireAt = moment().add(1, 'day')
                            .hours(schedule.start.hours())
                            .minutes(schedule.start.minutes() - 1);

        bot.pocket.save('TeamlineNotified', { id: emp.id, expireAt });
      }
    }

    done();
  });

  const job = bot.agenda.create('ask-for-actions');
  job.repeatEvery('1 minute');
  job.save();
};
