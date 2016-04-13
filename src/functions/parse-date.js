import 'sugar';
import moment from 'moment';

export default (string, base = moment(), separators = /\b(?:to|-|until|till)\b/i) => {
  string = string.replace(/\b(?:from|since|for)\b/gi, '');
  if (separators.test(string)) {
    const [from, to] = string.split(separators);

    return {
      from: moment(parse(from)),
      to: moment(parse(to)),
      range: true
    };
  }

  const b = moment(base);
  const diff = b.diff(moment());

  return moment(parse(string)).add(diff, 'ms');
};

const parse = string =>
  (Date.create(string).isValid() ? Date.create(string) : Date.create(`in ${string}`));
