const core = require('@actions/core');
const _ = require('lodash');
const superagent = require('superagent');
const fs = require('fs-extra');
const path = require('path');
const { allProducts } = require('./../../lib/shared');
const { log, warn, error } = require('./../../lib/utils');
const definitions = require('./../../assets/definitions');

core.setOutput('run_full', 'no');

const PREV_FILE = path.join(process.cwd(), '.tmp', 'previous.json');

const getPrevious = () => {
  return fs.readJson(PREV_FILE).catch(err => err);
};

const saveCurrent = currentData => {
  return fs.writeJson(PREV_FILE, currentData).then(() => currentData);
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

const lastReleaseDate = product =>
  _.chain(product)
    .get('releases', [])
    .last()
    .get('date', '1970-01-01')
    .value();

const searchForUnknownProjects = () => {
  return getAllProducts().then(allDefinitions => {
    const jetbrainsCodes = definitions.map(x => x.jetbrainsCode);

    const missingCasks = allDefinitions
      .filter(
        product =>
          !jetbrainsCodes.includes(product.code) &&
          _.get(product, 'distributions.mac', false) &&
          lastReleaseDate(product) > '2018-12-11'
      )
      .map(product => {
        const lastDownload = _.chain(product)
          .get('releases', [])
          .last()
          .get('downloads.mac.link')
          .value();
        if (!lastDownload) {
          return `${product.name} (${product.code}) has no downloadLink for MAC:
          ${JSON.stringify(product, null, 2)}`;
        }
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
      warn('Could not retrieve current jetbrains data');
      return false;
    }

    if (_.isError(previous)) {
      warn('Could not retrieve previous jetbrains data');
      return true;
    }

    if (_.isEqual(previous, current)) {
      warn('JetBrains has released no new versions');
      return false;
    }

    return true;
  })
  .then(shouldTrigger => {
    if (shouldTrigger) {
      warn('Triggering build');
      return core.setOutput('run_full', 'yes');
    }
    log('A build was not triggered');
  })
  .then(() => searchForUnknownProjects())
  .then(() => process.exit(0))
  .catch(e => {
    core.setFailed(e.message);
  });
