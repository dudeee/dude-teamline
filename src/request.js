import unirest from 'unirest';
import qs from 'qs';

export default (bot, uri) => {
  const { auth } = bot.config.teamline;

  return {
    get(url = '', query = {}) {
      url = `${uri}/${url}`;

      bot.log.silly('[teamline] request GET', url, query);
      return new Promise((resolve, reject) => {
        unirest.get(url)
          .query(qs.stringify(query))
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) {
              bot.log.error('[teamline] request GET', url, query, 'Error', response.error);
              return reject(response.error);
            }

            resolve(response.body);
          });
      });
    },

    post(url = '', body = {}) {
      url = `${uri}/${url}`;

      bot.log.silly('[teamline] request POST', url, body);
      return new Promise((resolve, reject) => {
        unirest.post(url)
          .send(body)
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) {
              bot.log.error('[teamline] request GET', url, body, 'Error', response.error);
              return reject(response.error);
            }

            resolve(response.body);
          });
      });
    },

    put(url = '', body = {}) {
      url = `${uri}/${url}`;

      bot.log.silly('[teamline] request PUT', url, body);
      return new Promise((resolve, reject) => {
        unirest.put(url)
          .send(body)
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) {
              bot.log.error('[teamline] request GET', url, body, 'Error', response.error);
              return reject(response.error);
            }

            resolve(response.body);
          });
      });
    },

    del(url = '', query = {}) {
      url = `${uri}/${url}`;

      bot.log.silly('[teamline] request DELETE', url, query);
      return new Promise((resolve, reject) => {
        unirest.delete(url)
          .query(qs.stringify(query))
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) {
              bot.log.error('[teamline] request GET', url, query, 'Error', response.error);
              return reject(response.error);
            }

            resolve(response.body);
          });
      });
    }
  };
};
