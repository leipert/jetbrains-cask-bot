const _ = require('lodash');
const GitHubApi = require('@octokit/rest');
const Promise = require('bluebird');
const superagent = require('superagent');
const cpPromise = require('child-process-promise').exec;
const { allProducts, UserAgent } = require('./shared');

const path = require('path');
const fs = require('fs-extra');
const github = new GitHubApi({
  baseUrl: 'https://api.github.com',
  headers: { 'user-agent': UserAgent },
  timeout: 5000,
});

github.authenticate({ type: 'token', token: process.env.JCB_GITHUB_API_TOKEN });

const getOpenPRs = () => {
  return github.pullRequests
    .list({
      owner: 'caskroom',
      repo: 'homebrew-cask',
      per_page: 100,
    })
    .then(res => res.data)
    .catch(e => {
      console.warn('Could not load PRs from github', e);
      throw e;
    });
};

const getPRFiles = prNum => {
  return github.pullRequests
    .listFiles({
      owner: 'caskroom',
      repo: 'homebrew-cask',
      number: prNum,
    })
    .then(res => res.data)
    .catch(e => {
      console.warn('Could not load PRs from github', e);
      throw e;
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
      return _.chain(data)
        .flatten()
        .map('filename')
        .sort()
        .uniq()
        .value();
    });
};

const definitions = require('./../assets/definitions');

const getCaskField = function(caskName, field) {
  return cpPromise(`brew cask _stanza ${field} ${caskName}`).then(result => {
    return result.stdout.replace(/\r?\n+/gi, '');
  });
};

const getCaskVersionOfApp = function({ caskName, jetbrainsCode, releaseChannel }) {
  return Promise.props({
    version: getCaskField(caskName, 'version'),
    sha256: getCaskField(caskName, 'sha256'),
    appcast: getCaskField(caskName, 'appcast'),
    appcastGenerated: `https://data.services.jetbrains.com/products/releases?code=${jetbrainsCode}&latest=true&type=${releaseChannel}`,
  });
};

const getJBVersionOfApp = function(jetbrains, { jetbrainsCode, versionField, releaseChannel }) {
  const releases = _.get(_.find(jetbrains, { code: jetbrainsCode }), 'releases', []);

  const jb = _.find(releases, { type: releaseChannel });

  if (releaseChannel !== 'release' && jb) {
    const latestStable = _.get(_.find(releases, { type: 'release' }), 'date', '1970-01-01');

    if (latestStable > _.get(jb, 'date', '1970-01-01')) {
      console.warn(
        `${jetbrainsCode} is set to release channel ${releaseChannel}, but there is a newer release on "release" ${latestStable}`
      );
    }
  }

  const download = _.get(jb, ['downloads', 'mac'], false);

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
        url: _.get(download, 'link'),
        build: jb.build,
      };
    });
};

const getStatus = (jetbrains, app) => {
  return Promise.props({
    name: app.caskName,
    cask: getCaskVersionOfApp(app),
    jetbrains: getJBVersionOfApp(jetbrains, app),
    filePath: getCaskPathPromise(app.caskName),
  }).then(({ name, cask, jetbrains, filePath }) => {
    return {
      name,
      cask,
      jetbrains,
      filePath,
      missingAppCast: !_.isEqual(cask.appcast, cask.appcastGenerated),
      needUpdate: !(
        _.isEqual(cask.version, jetbrains.version) && _.isEqual(cask.sha256, jetbrains.sha256)
      ),
    };
  });
};

const checkAll = definitions => {
  console.log('Retrieving latest releases from jetbrains...');

  return allProducts(definitions).then(products =>
    Promise.all(_.map(definitions, getStatus.bind(null, products)))
  );
};

const existsMergeRequest = (files, filePath) => _.some(files, file => _.endsWith(filePath, file));

const getCaskPathPromise = caskName => {
  return cpPromise(`find "$(brew --repository)/Library/Taps/homebrew" -name "${caskName}.rb"`).then(
    result => result.stdout.replace(/\r?\n+/gi, '')
  );
};

const bumpVersionInCask = app => {
  console.log(`Trying update for ${app.name} (${app.cask.version}) -> (${app.jetbrains.version})`);

  let commitMessage = `Update ${app.name} to ${app.jetbrains.version}`;

  if (app.cask.version === app.jetbrains.version) {
    commitMessage = `Fix sha256 of ${app.name}@${app.jetbrains.version}`;
  }

  const branch = `jcb_${app.name}_${app.jetbrains.version.replace(/\W/g, '_')}`;

  return Promise.resolve(app.filePath)
    .then(filePath => {
      console.log(`\tFound Cask File: ${filePath}`);

      let caskFile = fs.readFileSync(filePath, 'utf8');

      caskFile = caskFile
        .replace(/(version\s+').+?(')/g, `$1${app.jetbrains.version}$2`)
        .replace(/(appcast\s+').+?(',)/, `$1${app.cask.appcastGenerated}$2`)
        .replace(/(sha256\s+').+?(')/g, `$1${app.jetbrains.sha256}$2`);

      fs.writeFileSync(filePath, caskFile);

      const patchScriptPath = path.join(__dirname, 'create-patch.sh');

      const dir = path.dirname(filePath);
      return cpPromise(
        `bash ${patchScriptPath} "${dir}" "${app.name}" "${branch}" "${commitMessage}"`
      );
    })
    .then(function(result) {
      console.log('stdout:\n', result.stdout);
      console.log('stderr:\n', result.stderr);
    })
    .catch(function(err) {
      console.error('ERROR creating patch: ');
      console.error('stdout:\n', err.stdout);
      console.error('stderr:\n', err.stderr);
      throw new Error('ERROR creating patch');
    })
    .then(function() {
      let body = fs.readFileSync(path.join(__dirname, '../assets', 'PR_TEMPLATE.md'), 'utf8');

      if (app.cask.version === app.jetbrains.version) {
        body += `\nApparently jetbrains changed the release artifact for ${app.name}@${
          app.jetbrains.version
        }.\n`;
        body += `This PR fixes the sha256 sum of ${app.name}.\n`;
      }

      body += `\n${process.env.JCB_PULLREQUEST_CC}`;

      return github.pullRequests.create({
        owner: process.env.JCB_TARGET_OWNER,
        repo: process.env.JCB_TARGET_REPO,
        title: commitMessage,
        head: `${process.env.JCB_SOURCE_FORK_OWNER}:${branch}`,
        base: `master`,
        body: body,
        maintainer_can_modify: true,
      });
    })
    .then(function(data) {
      console.log(`Successfully created PR: ${data.data.html_url}`);
      return data;
    })
    .catch(function(err) {
      console.error(`Something went wrong creating a PR...`);
      console.error(err);
      return err;
    });
};

checkAll(definitions)
  .then(appsWithStatus => {
    appsWithStatus = _.sortBy(appsWithStatus, 'name');

    const latest = _.chain(appsWithStatus)
      .reject('needUpdate')
      .map('name')
      .value();

    console.log(
      `${_.size(latest)} of ${_.size(appsWithStatus)} casks are up to date (${latest.join(', ')})`
    );

    return _.filter(
      appsWithStatus,
      ({ needUpdate, missingAppCast }) => needUpdate || missingAppCast
    );
  })
  .then(updateAble => {
    let files = [];
    if (!_.isEmpty(updateAble)) {
      files = openPRFiles();
    }

    return {
      updateAble: updateAble,
      files: files,
    };
  })
  .then(Promise.props)
  .then(({ updateAble, files }) => {
    const needUpdate = _.filter(updateAble, 'needUpdate');
    return _.reject(needUpdate, app => {
      if (existsMergeRequest(files, app.filePath)) {
        console.log(`There already exists a Pull Request for ${app.name}\n---`);
        return true;
      }
      return false;
    });
  })
  .then(casks => {
    return Promise.reduce(
      casks,
      function(hasError, cask) {
        return bumpVersionInCask(cask).then(result => (_.isError(result) ? true : hasError));
      },
      false
    );
  })
  .then(hasError => {
    if (hasError) {
      console.warn('Jetbrains Cask Bot had an error');
      process.exit(1);
    }
    console.log('Jetbrains Cask Bot finished successfully');
  });