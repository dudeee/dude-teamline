import unirest from 'unirest';

export async function request(...args) {
  return new Promise((resolve, reject) => {
    unirest(...args).end(response => {
      if (response.error) reject(response.error);

      resolve(response.body);
    });
  });
}

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

    return `#${item.id} – ${name}`;
  }).join('\n');
};

export const findEmployee = async (uri, bot, message) => {
  const username = bot.find(message.user).name;
  const employee = await request('get', `${uri}/employee?username=${username}`);

  if (!employee) {
    return message.reply('You are not a registered employee');
  }

  return employee;
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

const BEST_DISTANCE = 1;
export function fuzzy(string, list) {
  string = string.toLowerCase();
  list = list.map(a => a.toLowerCase());

  const words = string.split(' ');
  const ps = permutations(words);

  for (let i = 0; i < list.length; i++) {
    const item = list[i];

    if (string === item) return [BEST_DISTANCE, i];

    const index = ps.findIndex(p => p.join(' ') === item);
    if (index > -1) return [BEST_DISTANCE, i];
  }

  const distance = list.map(item => {
    const args = item.length < string.length ? [item, string] : [string, item];
    return jaro(...args);
  });

  const max = Math.max(...distance);
  const closest = distance.indexOf(max);

  return [max, closest];
}

export function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Get weekday name by it's id or by date instance
 * @param  {number|Date} day weekday id (originally, 0 to 6) or a Date instance
 * @return {string} weekday name
 */
export function getWeekday(day) {
  let dayNumber = day;
  if (dayNumber instanceof Date) {
    dayNumber = dayNumber.getDay();
  }
  if (typeof dayNumber !== 'number') {
    throw new TypeError('the day ');
  }
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return weekdays[dayNumber % 7];
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
    const diff = input.getMinutes() % 30;
    const hours = input.getHours() % 12;
    const minutes = (diff < 15) ? '' : '30';
    return `:clock${hours}${minutes}:`;
  } catch (e) {
    throw new TypeError('input date should be a date object or a valid date string');
  }
}
