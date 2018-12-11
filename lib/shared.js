const _ = require('lodash');
const superagent = require('superagent');

const { version, repository } = require('../package.json');

const UserAgent = `JetbrainsCaskBot/${version} (+${repository})`;

const allProducts = definitions => {
  const code = definitions ? _.map(definitions, 'jetbrainsCode').join(',') : undefined;
  const path = 'https://data.services.jetbrains.com/products';
  return superagent
    .get(path)
    .query({
      _: new Date().getTime() / 1000,
      code: code,
    })
    .set('User-Agent', UserAgent)
    .then(result => {
      console.log(`Retreived latest releases from ${path}`);

      return result.body;
    });
};

module.exports = {
  allProducts,
  UserAgent,
};
