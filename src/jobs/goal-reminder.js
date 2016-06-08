import moment from 'moment';
import request from '../functions/request';
import _ from 'lodash';

export default async (bot, uri) => {
  const { get } = request(bot, uri);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');
  moment.relativeTimeThreshold('h', 20);

  const job = bot.schedule.scheduleJob('0 0 9 * * * *', async () => {
    const enabled = _.get(bot.config, 'teamline.daily_goal_reminder', true);
    if (!enabled) return null;
    const channel = _.get(bot.config, 'teamline.daily_goal_reminder.channel', 'deadlines');

    const goals = await get('goals', {
      include: [{
        model: 'Employee',
        as: 'Owner',
      }],
    });

    goals.forEach(async goal => {
      if (goal.Owner && goal.deadline) {
        const left = moment(goal.deadline).toNow(true);
        const msg = bot.t('teamline.goals.reminder', {
          left,
          goal: goal.name,
          owner: goal.Owner.username,
        });

        await bot.sendMessage(channel, msg, {
          websocket: false,
          parse: 'full',
        });
      }
    });
  });

  return job;
};
