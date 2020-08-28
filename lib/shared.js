const superagent = require('superagent');
const { log } = require('./utils');
const { version, repository } = require('../package.json');

const UserAgent = `JetbrainsCaskBot/${version} (+${repository})`;

const allProducts = async (definitions) => {
  const code = definitions ? definitions.map((x) => x.jetbrainsCode).join(',') : undefined;

  const path = 'https://data.services.jetbrains.com/products';
  let result = await superagent
    .get(path)
    .query({
      _: new Date().getTime() / 1000,
      code: code,
    })
    .set('User-Agent', UserAgent);

  log(`Retrieved latest releases from ${path}`);

  return result.body;
};

module.exports = {
  allProducts,
  UserAgent,
};
