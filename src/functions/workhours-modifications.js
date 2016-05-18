import moment from 'moment';
import _ from 'lodash';

export default (bot, workhours, modifications) => {
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  const final = _.cloneDeep(workhours);
  modifications.filter(item =>
    moment(item.end).isAfter(item.start)
  ).forEach(item => {
    if (item.type === 'add') {
      const Timeranges = [{
        start: moment(item.start).format('H:mm'),
        end: moment(item.end).format('H:mm'),
      }];

      const s = moment(item.start);
      const e = moment(item.end);
      const weekday = s.weekday();
      const wh = final.find(a => a.weekday === weekday);
      if (wh) {
        if (!wh.Timeranges) return;
        let merged = false;
        wh.modified = true;
        wh.Timeranges.forEach(time => {
          const iS = moment(time.start, 'HH:mm').weekday(weekday);
          const iE = moment(time.end, 'HH:mm').weekday(weekday);

          if (s.isBefore(iS) && e.isAfter(iS)) {
            time.start = s.format('H:mm');
            merged = true;
          }
          if (e.isAfter(iE) && s.isBefore(iE)) {
            time.end = e.format('H:mm');
            merged = true;
          }
        });
        if (!merged) {
          wh.Timeranges = wh.Timeranges.concat(Timeranges);
        }
        return;
      }

      final.push({ weekday, Timeranges, modified: true });
    } else {
      const s = moment(item.start);
      const e = moment(item.end);

      const whs = final.filter(a => a.weekday >= s.weekday() && a.weekday <= e.weekday());
      if (whs.length) {
        whs.forEach(wh => {
          if (!wh.Timeranges) return;

          for (let i = 0; i < wh.Timeranges.length; i++) {
            const time = wh.Timeranges[i];
            const iS = moment(time.start, 'HH:mm').dayOfYear(s.dayOfYear()).weekday(wh.weekday);
            const iE = moment(time.end, 'HH:mm').dayOfYear(s.dayOfYear()).weekday(wh.weekday);

            if (s.isSameOrBefore(iS) && e.isSameOrAfter(iE)) {
              wh.Timeranges.splice(i, 1);
              i--;
              wh.modified = true;
              continue;
            }

            if (s.isSameOrAfter(iS) && e.isSameOrBefore(iE)) {
              if (Math.abs(e.diff(iE), 'minutes')) {
                wh.Timeranges.push({
                  start: e.format('H:mm'),
                  end: time.end,
                });
              }

              time.end = s.format('H:mm');
              wh.modified = true;
              continue;
            }

            if (s.isSameOrBefore(iS) && e.isSameOrAfter(iS)) {
              time.start = e.format('H:mm');
              wh.modified = true;
              continue;
            }

            if (s.isSameOrBefore(iE) && e.isSameOrAfter(iE)) {
              time.end = s.format('H:mm');
              wh.modified = true;
              continue;
            }
          }
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
        moment(a.start, 'HH:mm').isSameOrBefore(moment(timerange.end, 'HH:mm')) &&
        moment(a.end, 'HH:mm').isAfter(moment(timerange.end, 'HH:mm'))
      );
      if (mergable > -1) {
        i--;
        timerange.end = wh.Timeranges[mergable].end;
        wh.Timeranges.splice(mergable, 1);
      }
    }
  });

  final.forEach(wh => {
    const timeranges = wh.Timeranges.map(a => _.pick(a, 'start', 'end'));
    const original = _.find(workhours, { weekday: wh.weekday });

    if (!original) return;

    const originalTs = original.Timeranges.map(a => _.pick(a, 'start', 'end'));

    const eq = originalTs.every((a, i) => {
      const target = timeranges[i];
      return target &&
             moment(a.start, 'HH:mm').isSame(moment(target.start, 'HH:mm')) &&
             moment(a.end, 'HH:mm').isSame(moment(target.end, 'HH:mm'));
    });
    if (eq && timeranges.length === originalTs.length) wh.modified = false;
  });

  return final;
};
