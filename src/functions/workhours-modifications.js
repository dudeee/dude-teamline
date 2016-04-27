import moment from 'moment';
import _ from 'lodash';

export default (bot, workhours, modifications) => {
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const addmodifications = modifications.filter(h => h.type === 'add').map(item => {
    const Timeranges = [{
      start: moment(item.start).format('HH:mm'),
      end: moment(item.end).format('HH:mm'),
    }];

    const s = moment(item.start);
    const weekday = s.weekday();
    const wh = workhours.find(a => a.weekday === weekday);
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

      const wh = workhours.find(a => a.weekday === s.weekday());
      if (wh) {
        wh.modified = true;
        wh.Timeranges.forEach(item => {
          const iS = moment(item.start, 'HH:mm').weekday(wh.weekday);
          const iE = moment(item.end, 'HH:mm').weekday(wh.weekday);

          if (s.isSameOrAfter(iS) && e.isSameOrBefore(iE)) {
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

  const final = workhours.concat(addmodifications);
  final.forEach(wh => {
    wh.Timeranges = wh.Timeranges.filter(({ start, end }) =>
      !moment(start, 'HH:mm').isSame(moment(end, 'HH:mm'))
    ).sort((a, b) =>
      moment(a.start, 'HH:mm').diff(moment(b.start, 'HH:mm'))
    );

    for (let i = 0; i < wh.Timeranges.length; i++) {
      const timerange = wh.Timeranges[i];
      const mergable = wh.Timeranges.findIndex(a =>
        moment(a.start, 'HH:mm').isSame(moment(timerange.end, 'HH:mm'))
      );
      if (mergable > -1) {
        i--;
        timerange.end = wh.Timeranges[mergable].end;
        wh.Timeranges.splice(mergable, 1);
      }
    }
  });

  return final;
};
