const _ = require('lodash');
const superagent = require('superagent');
const Promise = require('bluebird');

const definitions = require('./../assets/definitions');
const { log, warn } = require('./utils');
const { allProducts, UserAgent } = require('./shared');

const getJBVersionOfApp = async (
  jetbrains,
  { jetbrainsCode, versionField, releaseChannel, releaseType = 'mac' }
) => {
  const releases = _.get(_.find(jetbrains, { code: jetbrainsCode }), 'releases', []);

  const jb = _.find(releases, { type: releaseChannel });

  if (releaseChannel !== 'release' && jb) {
    const latestStable = _.get(_.find(releases, { type: 'release' }), 'date', '1970-01-01');

    if (latestStable > _.get(jb, 'date', '1970-01-01')) {
      warn(
        `${jetbrainsCode} is set to release channel ${releaseChannel}, but there is a newer release on "release" ${latestStable}`
      );
    }
  }

  const download = _.get(jb, ['downloads', releaseType], false);

  const response = await superagent
    .get(_.get(download, 'checksumLink'))
    .set('User-Agent', UserAgent)
    .buffer(true)
    .parse(require('superagent/lib/node/parsers/text'));

  const sha = _.head(response.text.split(/\s+/));
  const version = _.template(versionField)(jb);
  const url = _.get(download, 'link');

  const urlTemplate = url
    .replace(version, '#{version}')
    .replace(`/${jb.majorVersion}/`, '/#{version.before_comma.major_minor}/')
    .replace(jb.version, '#{version.before_comma}');

  return {
    version,
    sha256: sha,
    url,
    urlTemplate,
    build: jb.build,
  };
};

const getStatus = async (jetbrainsData, getCaskVersionOfApp, app) => {
  const name = app.caskName;

  const { cask, jetbrains } = await Promise.props({
    cask: getCaskVersionOfApp(app),
    jetbrains: getJBVersionOfApp(jetbrainsData, app),
  });

  return {
    name,
    cask,
    jetbrains,
    filePath: cask.filePath,
    missingAppCast: cask.appcast !== cask.appcastGenerated,
    needUpdate: !(
      cask.version === jetbrains.version &&
      cask.sha256 === jetbrains.sha256 &&
      cask.url === jetbrains.urlTemplate
    ),
  };
};

const getOutdatedCasks = async (getCaskVersionOfApp) => {
  log('Retrieving latest releases from jetbrains...');

  const jetBrainsData = await allProducts(definitions);

  const appsWithStatus = await Promise.all(
    definitions.map((app) => getStatus(jetBrainsData, getCaskVersionOfApp, app))
  );

  const { upToDate = [], needUpdate = [] } = _.chain(appsWithStatus)
    .sortBy('name')
    .groupBy((product) => (product.needUpdate ? 'needUpdate' : 'upToDate'))
    .value();

  log(
    [
      upToDate.length,
      'of',
      upToDate.length + needUpdate.length,
      'casks are up to date',
      `(${upToDate.map((x) => x.name).join(', ')})`,
    ].join(' ')
  );

  return needUpdate;
};

module.exports = getOutdatedCasks;
