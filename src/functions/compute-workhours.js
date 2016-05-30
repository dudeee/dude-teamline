import request from './request';
import workhoursModifications from './workhours-modifications';

export default async (bot, uri, employee, start, end) => {
  const { get } = request(bot, uri);
  const result = await get(`employee/${employee.id}/workhours`, { include: 'Timerange' });

  const modifications = await get(`employee/${employee.id}/schedulemodifications/accepted`, {
    $or: [{
      start: {
        $gte: start.toISOString(),
        $lt: end.toISOString(),
      },
    }, {
      end: {
        $gte: start.toISOString(),
        $lt: end.toISOString(),
      },
    }],
  });

  return workhoursModifications(bot, result, modifications);
}
