import 'sugar';
import moment from 'moment';
import _ from 'lodash';

const SEPARATORS = /\b(?:to|-|until|till|for)\b/i;
const KEYWORDS = /\b(?:from|since)\b/gi;
export default (bot, string, base = moment(), separators = SEPARATORS) => { // eslint-disable-line
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  string = string.replace(KEYWORDS, '');
  if (separators.test(string)) {
    const separator = separators.exec(string)[0];
    const [from, to] = string.split(separators);
    const dates = {
      from: moment(parse(from.trim())),
      to: moment(parse(to.trim()))
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

    return {
      from: dates.from,
      to: dates.to,
      range: true
    };
  }

  const b = moment(base);
  const diff = b.diff(moment());

  return moment(parse(string)).add(diff, 'ms');
};

const parse = string =>
  (Date.create(string).isValid() ? Date.create(string) : Date.create(`in ${string}`));
