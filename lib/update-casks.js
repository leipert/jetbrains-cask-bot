const _ = require('lodash');
const OctoKit = require('@octokit/rest');
const Promise = require('bluebird');
const superagent = require('superagent');
const cpPromise = require('child-process-promise').exec;
const { allProducts, UserAgent } = require('./shared');
const { log, warn, error } = require('./utils');

const path = require('path');
const fs = require('fs-extra');
const octokit = new OctoKit({
  auth: `token ${process.env.JCB_GITHUB_API_TOKEN}`,
  baseUrl: 'https://api.github.com',
  userAgent: UserAgent,
  request: {
    timeout: 5000,
  },
});

const getOpenPRs = () => {
  return octokit.pulls
    .list({
      owner: 'caskroom',
      repo: 'homebrew-cask',
      per_page: 100,
    })
    .then(res => res.data)
    .catch(e => {
      warn('Could not load PRs from github', e);
      throw e;
    });
};

const getPRFiles = prNum => {
  return octokit.pulls
    .listFiles({
      owner: 'caskroom',
      repo: 'homebrew-cask',
      pull_number: prNum,
    })
    .then(res => res.data)
    .catch(e => {
      warn('Could not load PRs from github', e);
      throw e;
    });
};

const getOpenPRFiles = prNumbers => {
  return Promise.all(_.map(prNumbers, prNum => getPRFiles(prNum)));
};

const openPRFiles = () => {
  log('Retrieving open PRs from caskroom/homebrew-cask...');

  return getOpenPRs()
    .then(data => _.map(data, 'number'))
    .then(getOpenPRFiles)
    .then(data => {
      log('Retrieved open PRs and which files they touch.');
      return _.chain(data)
        .flatten()
        .map('filename')
        .sort()
        .uniq()
        .value();
    });
};

const definitions = require('./../assets/definitions');

const getCaskField = (cask, field) => {
  const regex = new RegExp(`${field}\\s+(["'])(.+)\\1\\s*$`, 'gm');
  const match = regex.exec(cask);

  return match[2];
};

const getCaskVersionOfApp = async ({ caskName, jetbrainsCode, releaseChannel }) => {
  const path = await getCaskPathPromise(caskName);

  const cask = fs.readFileSync(path, 'utf8');

  const appcastGenerated = `https://data.services.jetbrains.com/products/releases?code=${jetbrainsCode}&latest=true&type=${releaseChannel}`;

  return {
    version: getCaskField(cask, 'version'),
    sha256: getCaskField(cask, 'sha256'),
    appcast: getCaskField(cask, 'appcast'),
    url: getCaskField(cask, 'url'),
    appcastGenerated,
  };
};

const getJBVersionOfApp = function(jetbrains, { jetbrainsCode, versionField, releaseChannel }) {
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

  const download = _.get(jb, ['downloads', 'mac'], false);

  return superagent
    .get(_.get(download, 'checksumLink'))
    .set('User-Agent', UserAgent)
    .buffer(true)
    .parse(require('superagent/lib/node/parsers/text'))
    .then(response => {
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
        _.isEqual(cask.version, jetbrains.version) &&
        _.isEqual(cask.sha256, jetbrains.sha256) &&
        _.isEqual(cask.url, jetbrains.urlTemplate)
      ),
    };
  });
};

const checkAll = definitions => {
  log('Retrieving latest releases from jetbrains...');

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
  log(`Trying update for ${app.name} (${app.cask.version}) -> (${app.jetbrains.version})`);

  let commitMessage = `Update ${app.name} to ${app.jetbrains.version}`;

  if (app.cask.version === app.jetbrains.version) {
    commitMessage = `Fix sha256 of ${app.name}@${app.jetbrains.version}`;
  }

  const branch = `jcb_${app.name}_${app.jetbrains.version.replace(/\W/g, '_')}`;

  return Promise.resolve(app.filePath)
    .then(filePath => {
      log(`\tFound Cask File: ${filePath}`);

      let caskFile = fs.readFileSync(filePath, 'utf8');

      caskFile = caskFile
        .replace(/(url\s+['"]).+?(['"])/g, `$1${app.jetbrains.urlTemplate}$2`)
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
      log('stdout:\n', result.stdout);
      log('stderr:\n', result.stderr);
    })
    .catch(function(err) {
      error('ERROR creating patch: ');
      error('stdout:\n', err.stdout);
      error('stderr:\n', err.stderr);
      throw new Error('ERROR creating patch');
    })
    .then(function() {
      let body = fs.readFileSync(path.join(__dirname, '../assets', 'PR_TEMPLATE.md'), 'utf8');

      if (app.cask.version === app.jetbrains.version) {
        body += `\nApparently jetbrains changed the release artifact for ${app.name}@${app.jetbrains.version}.\n`;
        body += `This PR fixes the sha256 sum of ${app.name}.\n`;
      }

      if (app.cask.url !== app.jetbrains.urlTemplate) {
        body += `\nApparently jetbrains changed the download URL for ${app.name}@${app.jetbrains.version}.\n`;
        body += `This PR adjusts the URL for ${app.name}.\n`;
      }

      body += `\n${process.env.JCB_PULLREQUEST_CC}`;

      return octokit.pulls.create({
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
      log(`Successfully created PR: ${data.data.html_url}`);
      return data;
    })
    .catch(function(err) {
      error(`Something went wrong creating a PR...`);
      error(err);

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

    log(
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
        log(`There already exists a Pull Request for ${app.name}\n---`);
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
      warn('Jetbrains Cask Bot had an error');
      process.exit(1);
    }
    log('Jetbrains Cask Bot finished successfully');
  });
