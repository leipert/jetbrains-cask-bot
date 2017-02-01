const _ = require('lodash');
const GitHubApi = require('github');
const Promise = require('bluebird');
const superagent = require('superagent');
const cpPromise = require('child-process-promise').exec;
const cp = require('child_process').execSync;
const path = require('path');

const version = require('../package.json').version;
const url = require('../package.json').repository;

const UserAgent = `JetbrainsCaskBot/${version} (+${url})`;

const cpSync = cmd => {
  return cp(cmd).toString();
};

const fs = require('fs-extra');
const github = new GitHubApi({
  protocol: 'https',
  host: 'api.github.com',
  headers: { 'user-agent': UserAgent },
  Promise: Promise,
  followRedirects: false,
  timeout: 5000
});

github.authenticate({ type: 'token', token: process.env.JCB_GITHUB_API_TOKEN });

const getOpenPRs = () => {
  return github.pullRequests.getAll({
    owner: 'caskroom',
    repo: 'homebrew-cask',
    per_page: 100
  });
};

const getPRFiles = prNum => {
  return github.pullRequests.getFiles({
    owner: 'caskroom',
    repo: 'homebrew-cask',
    number: prNum
  });
};

const getOpenPRFiles = prNumbers => {
  return Promise.all(_.map(prNumbers, prNum => getPRFiles(prNum)));
};

const openPRFiles = () => {
  console.log('Retrieving open PRs from caskroom/homebrew-cask...');

  return getOpenPRs()
    .then(data => _.map(data, 'number'))
    .then(getOpenPRFiles)
    .then(data => {
      console.log('Retrieved open PRs and which files they touch.');
      return _.chain(data).flatten().map('filename').sort().uniq().value();
    });
};

const definitions = require('./../assets/definitions');

const getCaskField = function(caskName, field) {
  return cpPromise(`brew cask _stanza ${field} ${caskName}`).then(result => {
    return result.stdout.replace(/\r?\n+/ig, '');
  });
};

const getAppCastCheckpoint = function(caskName, calculate) {
  return cpPromise(
    `brew cask _appcast_checkpoint ${caskName} ${calculate
      ? '--calculate'
      : ''}`
  ).then(result => {
    return result.stdout.replace(/\r?\n+/ig, '');
  });
};

const getCaskVersionOfApp = function({ caskName, jetbrainsCode }) {
  return Promise.props({
    version: getCaskField(caskName, 'version'),
    sha256: getCaskField(caskName, 'sha256'),
    appcast: getCaskField(caskName, 'appcast'),
    appcastGenerated: `https://data.services.jetbrains.com/products/releases?code=${jetbrainsCode}&latest=true&type=release`,
    appcastCheckpoint: getAppCastCheckpoint(caskName),
    appcastCurrent: getAppCastCheckpoint(caskName, true)
  });
};

const getJBVersionOfApp = function(jetbrains, { jetbrainsCode, versionField }) {
  const jb = _.head(_.get(jetbrains, [ jetbrainsCode ]), []);

  const download = _.get(jb, [ 'downloads', 'mac' ]);

  return superagent
    .get(_.get(download, 'checksumLink'))
    .set('User-Agent', UserAgent)
    .buffer(true)
    .parse(require('superagent/lib/node/parsers/text'))
    .then(response => {
      const sha = _.head(response.text.split(/\s+/));
      return {
        version: _.template(versionField)(jb),
        sha256: sha,
        url: _.get(download, 'link')
      };
    });
};

const getStatus = (jetbrains, app) => {
  return Promise
    .props({
      name: app.caskName,
      cask: getCaskVersionOfApp(app),
      jetbrains: getJBVersionOfApp(jetbrains, app)
    })
    .then(({ name, cask, jetbrains }) => {
      return {
        name,
        cask,
        jetbrains,
        latest: _.isEqual(cask.version, jetbrains.version) &&
          _.isEqual(cask.sha256, jetbrains.sha256)
      };
    });
  //const currentCask = getCaskVersionOfApp(app);
  // getJBVersionOfApp(app).then(console.log);
  //console.warn(currentCask, jbVersion)
};

const checkAll = definitions => {
  console.log('Retrieving latest releases from jetbrains...');

  return superagent
    .get('https://data.services.jetbrains.com/products/releases')
    .set('User-Agent', UserAgent)
    .query({
      latest: true,
      type: 'release',
      _: new Date().getTime() / 1000,
      code: _.map(definitions, 'jetbrainsCode').join(',')
    })
    .then(result => {
      console.log('Retreived latest releases.');

      const jetbrains = result.body;

      return Promise
        .all(_.map(definitions, getStatus.bind(null, jetbrains)))
        .then(appsWithStatus => {
          appsWithStatus = _.sortBy(appsWithStatus, 'name');

          const latest = _
            .chain(appsWithStatus)
            .filter('latest')
            .map('name')
            .join(', ')
            .value();

          console.log(`The casks ${latest} are up to date`);

          return _.reject(appsWithStatus, 'latest');
        });
    });
};

//https://data.services.jetbrains.com/products/releases?latest=true&type=release&_=1485378246936
const existsMergeRequest = (files, filePath) =>
  _.some(files, file => _.endsWith(filePath, file));

const getMissingCasks = definitions => {
  return cpPromise(`brew cask _stanza url --table | grep jetbrains`)
    .then(result => {
      return result.stdout;
    })
    .then(result => {
      return _
        .chain(result)
        .split(/\r?\n+/ig)
        .reject(_.isEmpty)
        .map(line => line.split('\t'))
        .reject(
          line =>
            _.some(definitions, ({ caskName }) => _.endsWith(line[0], caskName))
        )
        .value();
    });
};

Promise
  .props({
    needupdate: checkAll(definitions),
    files: openPRFiles(),
    missingCasks: getMissingCasks(definitions)
  })
  .then(function({ needupdate, files, missingCasks }) {
    _.forEach(missingCasks, cask => {
      console.log(`Missing ${cask[0]} definition for ${cask[1]}`);
    });

    _.forEach(needupdate, app => {
      console.log(
        `Trying update for ${app.name} (${app.cask.version}) -> (${app.jetbrains.version})`
      );

      const filePath = cpSync(
        `find "$(brew --repository)/Library/Taps/caskroom"  -name "${app.name}.rb"`
      ).replace(/\r?\n+/ig, '');
      const dir = path.dirname(filePath);

      console.log(`\tFound Cask File: ${filePath}`);

      if (existsMergeRequest(files, filePath)) {
        console.log(`\tThere already exists a Pull Request for ${app.name}`);
        return;
      }

      let caskFile = fs.readFileSync(filePath, 'utf8');

      caskFile = caskFile
        .replace(/(version\s+').+?(')/g, `$1${app.jetbrains.version}$2`)
        .replace(/(sha256\s+').+?(')/g, `$1${app.jetbrains.sha256}$2`);

      fs.writeFileSync(filePath, caskFile);

      const branch = `jcb_${app.name}_${app.jetbrains.version.replace(
        /\W/g,
        '_'
      )}`;

      const patchScriptPath = path.join(__dirname, 'create-patch.sh');

      try {
        const result = cpSync(
          `bash ${patchScriptPath} ${dir} ${app.name} ${branch} ${app.jetbrains.version}`
        );

        console.log(result.toString());

        let body = fs.readFileSync(
          path.join(__dirname, '../assets', 'PR_TEMPLATE.md'),
          'utf8'
        );
        body += `\n${process.env.JCB_PULLREQUEST_CC}`;

        github.pullRequests
          .create({
            owner: process.env.JCB_TARGET_OWNER,
            repo: process.env.JCB_TARGET_REPO,
            title: `Update ${app.name} to ${app.jetbrains.version}`,
            head: `${process.env.JCB_SOURCE_FORK_OWNER}:${branch}`,
            base: `master`,
            body: body,
            maintainer_can_modify: true
          })
          .then(function(data) {
            console.log(`Successfully created PR: ${data.html_url}`);
          });
      } catch (e) {
        console.warn(e);
      }
    });
  });
