import { wait } from '../functions/utils';
import moment from 'moment';
import request from '../functions/request';
import workhoursModifications from '../functions/workhours-modifications';
import _ from 'lodash';

export default (bot, uri) => {
  const { get } = request(bot, uri);

  bot.pocket.model('TeamlineNotified', { id: Number, expireAt: { type: Date, expires: 0 } });

  bot.schedule.scheduleJob('0 * * * * * *', async () => {
    console.log('ask-for-actions');
    bot.log.verbose('[teamline] ask-for-actions');
    const employees = await get('employees');

    const d = moment();
    for (const user of bot.users) {
      const emp = employees.find(a => a.username === user.name);
      if (!emp) continue;
      const notified = await bot.pocket.find('TeamlineNotified', { id: emp.id }).exec();
      if (notified.length) continue;

      const actions = await get(`employee/${emp.id}/actions/today`);
      if (actions.length) continue;

      const modifications = await get(`employee/${emp.id}/schedulemodifications/accepted`);
      const rawWorkhours = await get(`employee/${emp.id}/workhours`, {
        weekday: d.day(),
        include: 'Timerange'
      });

      const [workhours] = workhoursModifications(rawWorkhours, modifications);

      if (!workhours || !workhours.Timeranges.length) continue;

      const firstTimerange = workhours.Timeranges[0];
      const schedule = {
        start: moment(firstTimerange.start, 'HH:mm'),
        end: moment(firstTimerange.end, 'HH:mm')
      };

      const diff = (d.hours() - schedule.start.hours()) * 60
                 + (d.minutes() - schedule.start.minutes());
      const delay = _.get(bot.config, 'teamline.actions.ask.delay') || 30;
      if (diff > delay) {
        await bot.sendMessage(user.name, 'Hey! What are you going to do today? 😁');
        const RATE_LIMIT = 1000;
        await wait(RATE_LIMIT);


        const expireAt = moment().add(1, 'day')
                            .hours(schedule.start.hours())
                            .minutes(schedule.start.minutes() - 1);

        bot.pocket.save('TeamlineNotified', { id: emp.id, expireAt });
      }
    }
  });
};
