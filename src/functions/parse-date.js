import 'sugar';
import moment from 'moment';
import _ from 'lodash';

export default (bot, string, base = moment(), separators = /\b(?:to|-|until|till)\b/i) => { // eslint-disable-line
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');

  string = string.replace(/\b(?:from|since|for)\b/gi, '');
  if (separators.test(string)) {
    const [from, to] = string.split(separators);

    const mfrom = moment(parse(from.trim()));
    const mto = moment(parse(to.trim()));

    if (mto < mfrom) {
      const days = mfrom.dayOfYear() - mto.dayOfYear();
      mto.add(days, 'days');
    }

    return {
      from: mfrom,
      to: mto,
      range: true
    };
  }

  const b = moment(base);
  const diff = b.diff(moment());

  return moment(parse(string)).add(diff, 'ms');
};

const parse = string =>
  (Date.create(string).isValid() ? Date.create(string) : Date.create(`in ${string}`));
