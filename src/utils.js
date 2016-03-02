import _ from 'lodash';

export const printList = (list, empty = 'Nothing to show 😶') => {
  if (!list.length) return empty;

  list = list.sort((a, b) => a.id - b.id);

  return list.map((item, index) => {
    // let mark = typeof item.done === 'undefined' ? '' :
    //                   item.done ? '✅' : '❎';
    const name = item.name || (`${item.firstname} ${item.lastname}`);

    if (item.Project) {
      return `${index + 1}. *${item.Project.name}* > ${name}`;
    }
    if (item.Role) {
      return `${index + 1}. *(${item.Role.name})* > ${name}`;
    }

    return `#${item.id} – ${name}`;
  }).join('\n');
};

function jaro(a, b) {
  const matchingDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;

  let m = 0;
  let t = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) {
      m++;
      continue;
    }

    const min = Math.max(0, i - matchingDistance);
    const max = i + matchingDistance + 1;

    const range = b.slice(min, max);

    if (range.indexOf(a[i]) > -1) {
      m++;
      t++;
    }
  }

  t /= 2;

  return (1 / 3) * (m / a.length + m / b.length + (m - t) / m) || 0;
}

export function factoriadic(n, length) {
  let fd = [];
  let last = n;
  for (let i = 1; ; i++) {
    fd.unshift(last % i);
    last = Math.floor(last / i);
    if (last <= 0) break;
  }

  if (fd.length < length) {
    const i = length - fd.length;

    fd = new Array(i).fill(0).concat(fd);
  }

  return fd;
}

export function factorial(n) {
  let total = 1;
  for (let i = 1; i <= n; i++) {
    total *= i;
  }

  return total;
}

export function permutations(arr) {
  const n = arr.length;
  const b = factorial(n);

  const ps = [];

  for (let i = 0; i < b; i++) {
    const fd = factoriadic(i, n);
    const from = arr.slice(0);
    const record = [];

    for (let j of fd) {
      j = j || 0;
      record.push(from[j]);
      from.splice(j, 1);
    }

    ps.push(record);
  }

  return ps;
}

const NEIGHBOUR_RANGE = 2;
export function fuzzy(string, list, DISTANCE_REQUIRED) {
  string = string.toLowerCase().trim();
  list = list.map(a => a.toLowerCase().trim());

  const distance = [];
  const sourceWords = _.words(string);

  for (let i = 0; i < list.length; i++) {
    const sentence = list[i];
    const words = _.words(sentence);

    const d = sourceWords.reduce((a, b, j) => {
      const start = Math.max(0, j - NEIGHBOUR_RANGE);
      const neighbours = words.slice(start, j + NEIGHBOUR_RANGE);
      const ds = neighbours.map((x) => jaro(b, x));

      return a + Math.max(...ds);
    }, 0) / sourceWords.length;

    distance.push({
      distance: d,
      index: i,
      length: sentence.length
    });
  }

  const max = distance.reduce((a, b) => {
    if (b.distance > a.distance ||
       (b.distance === a.distance &&
        Math.abs(string.length - b.length) < Math.abs(string.length - a.length))) {
      return b;
    }

    return a;
  }, { distance: 0, index: -1 });

  if (DISTANCE_REQUIRED && max.distance < DISTANCE_REQUIRED) return [false, false];

  return [max.distance, max.index];
}

export function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Get the nearest clock emoji for slack
 * @param  {Date|String} date = new Date(]
 * @return {string} emoji string
 */
export function clockEmoji(date = new Date()) {
  try {
    const timeRegex = /\d{2}:\d{2}:\d{2}/;
    let input;
    if (typeof date === 'string' && timeRegex.test(date.trim())) {
      const [hours, minutes] = date.split(':');
      input = new Date();
      input.setHours(hours);
      input.setMinutes(minutes);
    } else if (date instanceof Date) {
      input = date;
    } else {
      input = new Date(date);
    }
    if (!(input instanceof Date)) {
      throw new TypeError();
    }
    const diff = (input.getMinutes() > 15 && input.getMinutes() < 45)
    ? 30
    : input.getMinutes() % 30;
    const hours = (input.getHours() !== 12) ? input.getHours() % 12 : 12;
    const minutes = (diff < 15) ? '' : '30';
    return `:clock${hours}${minutes}:`;
  } catch (e) {
    throw new TypeError('input date should be a date object or a valid date string');
  }
}
