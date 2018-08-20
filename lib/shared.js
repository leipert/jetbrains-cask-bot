const _ = require('lodash');
const superagent = require('superagent');

const allProducts = definitions => {
  return superagent.get('https://data.services.jetbrains.com/products').query({
    _: new Date().getTime() / 1000,
    code: _.map(definitions, 'jetbrainsCode').join(','),
  });
};

module.exports = {
  allProducts,
};
