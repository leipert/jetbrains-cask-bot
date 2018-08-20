const _ = require('lodash');
const superagent = require('superagent');
const fs = require('fs-extra');
const path = require('path');
const { allProducts } = require('./shared');

const definitions = require('./../assets/definitions');

const CI_PROJECT_URL = process.env.CI_PROJECT_URL || 'https://example.org';
const CI_JOB_NAME = process.env.CI_JOB_NAME || 'job';
const GITHUB_PATH = 'leipert/jetbrains-cask-bot';
const TRAVIS_ROOT = 'travis-ci.org';

const previous = `${CI_PROJECT_URL}/-/jobs/artifacts/master/raw/previous.json?job=${CI_JOB_NAME}`;

const getPrevious = () => {
  return superagent
    .get(previous)
    .then(result => result.body)
    .catch(err => err);
};

const saveCurrent = currentData => {
  return fs
    .writeJson(path.join(__dirname, '..', 'previous.json'), currentData)
    .then(() => currentData);
};

const getCurrent = () => {
  return allProducts(definitions)
    .then(result => result.body)
    .then(saveCurrent)
    .catch(err => err);
};

const triggerBuild = () => {
  return superagent
    .post(`https://api.${TRAVIS_ROOT}/repo/${encodeURIComponent(GITHUB_PATH)}/requests`)
    .set('Accept', 'application/json')
    .set('Travis-API-Version', '3')
    .set('Authorization', `token ${process.env.TRAVIS_API_TOKEN}`)
    .send({ request: { branch: 'master' } })
    .then(() => {
      console.log(`
      Successfully triggered build on travis CI:
      See: https://${TRAVIS_ROOT}/${GITHUB_PATH}/builds
      `);
    })
    .catch(err => {
      console.warn(`
      Error triggering travis CI:
      Body: ${err.text}
      Status Code: ${err.status}
      `);
      process.exit(1);
    });
};

Promise.all([getPrevious(), getCurrent()])
  .then(([previous, current]) => {
    if (_.isError(current)) {
      console.warn('Could not retrieve current jetbrains data');
      return false;
    }

    if (_.isError(previous)) {
      console.warn('Could not retrieve previous jetbrains data');
      return true;
    }

    if (_.isEqual(previous, current)) {
      console.warn('JetBrains has released no new versions');
      return false;
    }

    return true;
  })
  .then(shouldTrigger => {
    if (shouldTrigger) {
      console.warn('Triggering build');
      return triggerBuild();
    }
    console.log('A build was not triggered');
  })
  .then(() => process.exit(0));
