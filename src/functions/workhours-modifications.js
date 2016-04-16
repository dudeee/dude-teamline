import moment from 'moment';
import _ from 'lodash';

export default (bot, workhours, modifications, date = moment()) => {
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const addmodifications = modifications.filter(h => h.type === 'add').map(item => {
    const Timeranges = [{
      start: moment(item.start).format('HH:mm'),
      end: moment(item.end).format('HH:mm'),
    }];

    const s = moment(item.start);
    const weekday = s.weekday();
    const wh = workhours.find(a => a.weekday === weekday && date.week() === s.week());
    if (wh) {
      wh.modified = true;
      wh.Timeranges = wh.Timeranges.concat(Timeranges);
      return null;
    }

    return { weekday, Timeranges, modified: true };
  }).filter(a => a);

  modifications
    .filter(h => h.type === 'sub')
    .forEach(time => {
      const s = moment(time.start);
      const e = moment(time.end);

      const wh = workhours.find(a => a.weekday === s.weekday() && date.week() === s.week());
      if (wh) {
        wh.modified = true;
        wh.Timeranges.forEach(item => {
          const iS = moment(item.start, 'HH:mm').weekday(wh.weekday);
          const iE = moment(item.end, 'HH:mm').weekday(wh.weekday);

          if (s.isSameOrAfter(iS)) {
            if (Math.abs(e.diff(iE), 'minutes')) {
              wh.Timeranges.push({
                start: e.format('HH:mm'),
                end: item.end
              });
            }

            item.end = s.format('HH:mm');
          }

          return item;
        });
      }
    });

  return workhours.concat(addmodifications);
};
