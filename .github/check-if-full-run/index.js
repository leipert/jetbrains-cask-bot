const core = require('@actions/core');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { allProducts } = require('./../../lib/shared');
const definitions = require('./../../assets/definitions');

core.setOutput('run_full', 'no');

const TMP_DIR = path.join(process.cwd(), 'tmp');
const PREV_FILE = path.join(TMP_DIR, 'previous.json');

const getPrevious = async () => {
  try {
    const json = fs.readFileSync(PREV_FILE, 'utf8');

    return JSON.parse(json);
  } catch (err) {
    return err;
  }
};

const saveCurrent = async currentData => {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
  }

  fs.writeFileSync(PREV_FILE, JSON.stringify(currentData, null, 2));

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

const getCurrent = async () => {
  try {
    const jetbrainsCodes = definitions.map(x => x.jetbrainsCode);

    const allDefinitions = await getAllProducts();

    const currentData = allDefinitions.filter(product => jetbrainsCodes.includes(product.code));

    return saveCurrent(currentData);
  } catch (err) {
    return err;
  }
};

const lastReleaseDate = product =>
  _.chain(product)
    .get('releases', [])
    .last()
    .get('date', '1970-01-01')
    .value();

const searchForUnknownProjects = async () => {
  let allDefinitions = await getAllProducts();

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
};

async function main() {
  const [previous, current] = await Promise.all([getPrevious(), getCurrent()]);

  let shouldTrigger = true;

  if (_.isError(current)) {
    core.warning('Could not retrieve current jetbrains data');
    core.warning(current.message);
    shouldTrigger = false;
  }

  if (_.isError(previous)) {
    core.warning('Could not retrieve previous jetbrains data');
    core.warning(previous.message);
  }

  if (_.isEqual(previous, current)) {
    core.warning('JetBrains has released no new versions');
    shouldTrigger = false;
  }

  if (shouldTrigger) {
    core.warning('Triggering build');
    core.setOutput('run_full', 'yes');
  } else {
    core.warning('A build was not triggered');
  }

  await searchForUnknownProjects();

  return process.exit(0);
}

main().catch(e => {
  core.setFailed(e.message);
});
