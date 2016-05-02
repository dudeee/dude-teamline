import moment from 'moment';
import _ from 'lodash';

export default (bot, workhours, modifications) => {
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const final = workhours.slice(0);
  modifications.forEach(item => {
    if (item.type === 'add') {
      const Timeranges = [{
        start: moment(item.start).format('HH:mm'),
        end: moment(item.end).format('HH:mm'),
      }];

      const s = moment(item.start);
      const weekday = s.weekday();
      const wh = final.find(a => a.weekday === weekday);
      if (wh) {
        wh.modified = true;
        wh.Timeranges = wh.Timeranges.concat(Timeranges);
        return;
      }

      final.push({ weekday, Timeranges, modified: true });
    } else {
      const s = moment(item.start);
      const e = moment(item.end);

      const wh = final.find(a => a.weekday === s.weekday());
      if (wh) {
        wh.modified = true;
        wh.Timeranges.forEach(time => {
          const iS = moment(time.start, 'HH:mm').weekday(wh.weekday);
          const iE = moment(time.end, 'HH:mm').weekday(wh.weekday);

          if (s.isSameOrAfter(iS) && e.isSameOrBefore(iE)) {
            if (Math.abs(e.diff(iE), 'minutes')) {
              wh.Timeranges.push({
                start: e.format('HH:mm'),
                end: time.end
              });
            }

            time.end = s.format('HH:mm');
          }

          return time;
        });
      }
    }
  });

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
