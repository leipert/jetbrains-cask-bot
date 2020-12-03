const core = require('@actions/core');
const getOutdatedCasks = require('./lib/outdated-casks');
const { log } = require('./lib/utils');
const { getRemoteCask } = require('./lib/cask-info');

getOutdatedCasks(getRemoteCask)
  .then((casks) => {
    if (casks.length > 0) {
      log(`${casks.length} casks need an update.`);
    } else {
      log('All casks up to date.');
    }

    core.setOutput('update-needed', casks.length > 0);
  })
  .catch((error) => {
    core.setFailed(error.message);
  });
