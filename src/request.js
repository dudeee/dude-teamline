import unirest from 'unirest';

export default (bot, uri) => {
  const { auth } = bot.config.teamline;

  return {
    get(url = '', query = {}) {
      url = `${uri}/${url}`;

      return new Promise((resolve, reject) => {
        unirest.get(url)
          .query(query)
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) return reject(response.error);

            resolve(response.body);
          });
      });
    },

    post(url = '', body = {}) {
      url = `${uri}/${url}`;

      return new Promise((resolve, reject) => {
        unirest.post(url)
          .send(body)
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) return reject(response.error);

            resolve(response.body);
          });
      });
    },

    put(url = '', body = {}) {
      url = `${uri}/${url}`;

      return new Promise((resolve, reject) => {
        unirest.put(url)
          .send(body)
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) return reject(response.error);

            resolve(response.body);
          });
      });
    },

    del(url = '', query = {}) {
      url = `${uri}/${url}`;

      return new Promise((resolve, reject) => {
        unirest.delete(url)
          .query(query)
          .query({
            [auth.key]: auth.token
          }).end(response => {
            if (response.error) return reject(response.error);

            resolve(response.body);
          });
      });
    }
  };
};
