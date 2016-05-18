import 'sugar';
import moment from 'moment';
import _ from 'lodash';

const SEPARATORS = /\b(?:to|-|until|till|for)\b/i;
const KEYWORDS = /\b(?:from|since|at)\b/gi;
const SYMBOLS = /\.|,|'|"/gi;

export default (bot, string, base = moment(), separators = SEPARATORS) => { // eslint-disable-line
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  string = string.replace(KEYWORDS, '');
  if (separators.test(string)) {
    const separator = separators.exec(string)[0];
    const [from, to] = string.split(separators);
    const dates = {
      from: moment(parse(from.trim())).add(1),
      to: moment(parse(to.trim())).add(1),
    };

    if (separator === 'for') {
      dates.to = dates.from.isValid()
                 ? dates.from.clone().add(dates.to.diff(moment()))
                 : moment().add(dates.to.diff(moment()));
    }

    if (dates.from > dates.to) {
      const days = dates.from.dayOfYear() - dates.to.dayOfYear();
      dates.to.add(days, 'days');
    }

    // if they are not days apart, then probably there is a mistake
    // in AM/PM of dates, e.g. `1pm to 1:15`, the second date is
    // treated as `AM`
    if (dates.from > dates.to && dates.from.hour() > 12 && dates.to.hour() <= 12) {
      dates.to.add(12, 'hours');
    }

    return {
      from: dates.from,
      to: dates.to,
      range: true,
    };
  }

  const b = moment(base);
  const diff = b.diff(moment());

  return moment(parse(string)).add(diff, 'ms').add(1);
};

const parse = (string, retry) => {
  const date = Date.create(string).isValid() ? Date.create(string) : Date.create(`in ${string}`);

  if (!date.isValid() && !retry) return parse(string.replace(SYMBOLS, ''), true);

  return date;
};
