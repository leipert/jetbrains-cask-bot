const core = require('@actions/core');
const _ = require('lodash');
const superagent = require('superagent');
const fs = require('fs-extra');
const path = require('path');
const { allProducts } = require('./../../lib/shared');
const definitions = require('./../../assets/definitions');

core.setOutput('run_full', 'no');

const TMP_DIR = path.join(process.cwd(), '.tmp');
const PREV_FILE = path.join(TMP_DIR, 'previous.json');

const getPrevious = () => {
  return fs.readJson(PREV_FILE).catch(err => err);
};

const saveCurrent = async currentData => {

  await fs.ensureDir(TMP_DIR);

  await fs.writeJson(PREV_FILE, currentData);

  return currentData;
};

let all = null;

const getAllProducts = async () => {
  if (all) {
    return all;
  }

  all = await allProducts();

  return all;
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
      core.warning('Could not retrieve current jetbrains data');
      core.warning(current.message);
      return false;
    }

    if (_.isError(previous)) {
      core.warning('Could not retrieve previous jetbrains data');
      core.warning(previous.message);
      return true;
    }

    if (_.isEqual(previous, current)) {
      core.warning('JetBrains has released no new versions');
      return false;
    }

    return true;
  })
  .then(shouldTrigger => {
    if (shouldTrigger) {
      core.warning('Triggering build');
      return core.setOutput('run_full', 'yes');
    }
    core.warning('A build was not triggered');
  })
  .then(() => searchForUnknownProjects())
  .then(() => process.exit(0))
  .catch(e => {
    core.setFailed(e.message);
  });
