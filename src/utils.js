import unirest from 'unirest';
import _ from 'lodash';

export async function request(...args) {
  return new Promise((resolve, reject) => {
    unirest(...args).end(response => {
      if (response.error) reject(response.error);

      resolve(response.body);
    });
  })
}

export const printList = (list, empty = 'Nothing to show 😶') => {
  if (!list.length) return empty;

  list = list.sort((a, b) => {
    return a.id - b.id;
  });/*.sort(a => {
    return a.done ? -1 : 1;
  });*/

  return list.map((item, index) => {
    // let mark = typeof item.done === 'undefined' ? '' :
    //                   item.done ? '✅' : '❎';
    let mark = '';
    let name = item.name || (item.firstname + ' ' + item.lastname);
    return `${mark} #${item.id} – ${name}`;
  }).join('\n');
}

export const findEmployee = async (uri, bot, message) => {
  let username = bot.find(message.user).name;
  let employee = await request('get', `${uri}/employee?username=${username}`);

  if (!employee) {
    return message.reply('You are not a registered employee');
  }

  return employee;
}

const BEST_DISTANCE = 1;
export function fuzzy(string, list) {
  string = string.toLowerCase();
  list = list.map(a => a.toLowerCase());

  let words = string.split(' ');
  let ps = permutations(words);

  for (let i = 0; i < list.length; i++) {
    let item = list[i];

    if (string === item) return [BEST_DISTANCE, i];

    let index = ps.findIndex(p => p.join(' ') === item);
    if (index > -1) return [BEST_DISTANCE, i];
  }

  let distance = list.map(item => {
    return jaro(string, item);
  });

  let max = Math.max(...distance);
  let closest = distance.indexOf(max);

  return [max, closest];
}

// const MAX_LENGTH = 6;
// export function levenshtein(a, b) {
//   if (a.length > MAX_LENGTH || b.length > MAX_LENGTH) return Infinity;
//
//   if (Math.min(a.length, b.length) === 0)
//     return Math.max(a.length, b.length);
//
//   let x = levenshtein(a.slice(0, -1), b) + 1,
//       y = levenshtein(a, b.slice(0, -1)) + 1,
//       z = levenshtein(a.slice(0, -1), b.slice(0, -1)) + (a[a.length - 1] === b[b.length - 1] ? 0 : 1);
//   return Math.min(x, y, z);
// }
//
function jaro(a, b) {
  let matchingDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;

  let m = 0;
  let t = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) {
      m++;
      continue;
    }

    var min = Math.max(0, i - matchingDistance),
        max = i + matchingDistance + 1;

    let range = b.slice(min, max);

    if (range.indexOf(a[i]) > -1) {
      m++;
      t++;
    }
  }

  t /= 2;

  return 1/3 * (m / a.length + m / b.length + (m - t)/m) || 0;
}

export function factoriadic(n, length) {
  let fd = [];
  let last = n;
  for (let i = 1; true; i++) {
    fd.unshift(last % i);
    last = Math.floor(last / i);
    if (last <= 0) break;
  }

  if (fd.length < length) {
    let i = length - fd.length;

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

  let ps = [];

  for (let i = 0; i < b; i++) {
    var fd = factoriadic(i, n);
    var from = arr.slice(0);
    var record = [];

    for (let j of fd) {
      j = j || 0;
      record.push(from[j]);
      from.splice(j, 1);
    }
    ps.push(record)
  }

  return ps;
}
