import moment from 'moment';
import parseFormat from 'moment-parseformat';

export default (string) => {
  const format = parseFormat(string);
  return moment(string, format);
};
