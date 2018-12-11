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

let all = null;

const getAllProducts = () => {
  if (all) {
    return Promise.resolve(all);
  }

  return allProducts().then(products => {
    all = products;
    return products;
  });
};

const getCurrent = () => {
  return getAllProducts()
    .then(allDefinitions => {
      const jetbrainsCodes = definitions.map(x => x.jetbrainsCode);

      return allDefinitions.filter(product => jetbrainsCodes.includes(product.code));
    })
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
    });
};

const lastReleaseDate = product => product.releases[product.releases.length - 1].date;

const searchForUnknownProjects = () => {
  return getAllProducts().then(allDefinitions => {
    const jetbrainsCodes = definitions.map(x => x.jetbrainsCode);

    const missingCasks = allDefinitions
      .filter(product => {
        return (
          !jetbrainsCodes.includes(product.code) &&
          lastReleaseDate(product) > '2018-12-11' &&
          product.distributions &&
          product.distributions.mac
        );
      })
      .map(product => {
        const lastRelease = product.releases[product.releases.length - 1];
        const lastDownload =
          lastRelease &&
          lastRelease.downloads &&
          lastRelease.downloads.mac &&
          lastRelease.downloads.mac.link;
        return `Missing cask (${product.code}): ${product.name} (${product.link})
    \t\tLast release: ${lastReleaseDate(product)}, ${lastDownload}`;
      });

    if (missingCasks.length > 0) {
      throw new Error(`
      Found unknown casks:
      \t${missingCasks.join('\n\t')}
    `);
    }
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
  .then(() => searchForUnknownProjects())
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  });
