const superagent = require('superagent');
const { Octokit } = require('@octokit/rest');
const { log } = require('./utils');
const { version, repository } = require('../package.json');

const util = require('util');
const cpPromise = util.promisify(require('child_process').exec);

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

const octokit = new Octokit({
  auth: `token ${process.env.JCB_GITHUB_API_TOKEN}`,
  baseUrl: 'https://api.github.com',
  userAgent: UserAgent,
  request: {
    timeout: 5000,
  },
});

module.exports = {
  cpPromise,
  allProducts,
  UserAgent,
  octokit,
};
