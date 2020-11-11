const _ = require('lodash');
const { Octokit } = require('@octokit/rest');
const Promise = require('bluebird');
const superagent = require('superagent');
const util = require('util');
const cpPromise = util.promisify(require('child_process').exec);
const { allProducts, UserAgent } = require('./shared');
const { log, warn, error } = require('./utils');

const path = require('path');
const fs = require('fs');
const octokit = new Octokit({
  auth: `token ${process.env.JCB_GITHUB_API_TOKEN}`,
  baseUrl: 'https://api.github.com',
  userAgent: UserAgent,
  request: {
    timeout: 5000,
  },
});

const getOpenPRs = async () => {
  try {
    const { data } = await octokit.pulls.list({
      owner: 'caskroom',
      repo: 'homebrew-cask',
      per_page: 100,
    });

    return data;
  } catch (e) {
    warn('Could not load PRs from github', e);
    throw e;
  }
};

const getPRFiles = async (prNum) => {
  try {
    const { data } = await octokit.pulls.listFiles({
      owner: 'caskroom',
      repo: 'homebrew-cask',
      pull_number: prNum,
    });

    return data;
  } catch (e) {
    warn('Could not load PRs from github', e);
    throw e;
  }
};

const getOpenPRFiles = (prNumbers) => {
  return Promise.all(prNumbers.map((prNum) => getPRFiles(prNum)));
};

const openPRFiles = async () => {
  log('Retrieving open PRs from caskroom/homebrew-cask...');

  const openPrs = await getOpenPRs();

  const prNumbers = openPrs.map((x) => x.number);

  const openPrFiles = await getOpenPRFiles(prNumbers);

  log('Retrieved open PRs and which files they touch.');

  return openPrFiles.flat().map((x) => x.filename);
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

const getStatus = async (jetbrainsData, app) => {
  const name = app.caskName;

  const { cask, jetbrains, filePath } = await Promise.props({
    cask: getCaskVersionOfApp(app),
    jetbrains: getJBVersionOfApp(jetbrainsData, app),
    filePath: getCaskPathPromise(name),
  });

  return {
    name,
    cask,
    jetbrains,
    filePath,
    missingAppCast: cask.appcast !== cask.appcastGenerated,
    needUpdate: !(
      cask.version === jetbrains.version &&
      cask.sha256 === jetbrains.sha256 &&
      cask.url === jetbrains.urlTemplate
    ),
  };
};

const checkAll = async (definitions) => {
  log('Retrieving latest releases from jetbrains...');

  const jetBrainsData = await allProducts(definitions);

  return Promise.all(definitions.map((app) => getStatus(jetBrainsData, app)));
};

const existsMergeRequest = (files, filePath) => files.some((file) => filePath.endsWith(file));

const getCaskPathPromise = (caskName) => {
  return cpPromise(
    `find "$(brew --repository)/Library/Taps/homebrew" -name "${caskName}.rb"`
  ).then((result) => result.stdout.replace(/\r?\n+/gi, ''));
};

const createPatch = async (app, branch, commitMessage) => {
  try {
    const filePath = app.filePath;
    log(`\tFound Cask File: ${filePath}`);

    let caskFile = fs.readFileSync(filePath, 'utf8');

    caskFile = caskFile
      .replace(/(url\s+(['"])).+?(\2)/g, `$1${app.jetbrains.urlTemplate}$2`)
      .replace(/(version\s+(['"])).+?(\2)/g, `$1${app.jetbrains.version}$2`)
      .replace(/(appcast\s+(['"])).+?(\2,)/, `$1${app.cask.appcastGenerated}$2`)
      .replace(/(sha256\s+(['"])).+?(\2)/g, `$1${app.jetbrains.sha256}$2`);

    fs.writeFileSync(filePath, caskFile);

    const patchScriptPath = path.join(__dirname, 'create-patch.sh');

    const dir = path.dirname(filePath);

    let result = await cpPromise(
      `bash ${patchScriptPath} "${dir}" "${app.name}" "${branch}" "${commitMessage}"`
    );
    log('stdout:\n', result.stdout);
    log('stderr:\n', result.stderr);
  } catch (err) {
    error('ERROR creating patch: ');
    error('stdout:\n', err.stdout);
    error('stderr:\n', err.stderr);
    throw new Error('ERROR creating patch');
  }
};

const createPR = async (app, branch, commitMessage) => {
  try {
    await createPatch(app, branch, commitMessage);
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

    let data = await octokit.pulls.create({
      owner: process.env.JCB_TARGET_OWNER,
      repo: process.env.JCB_TARGET_REPO,
      title: commitMessage,
      head: `${process.env.JCB_SOURCE_FORK_OWNER}:${branch}`,
      base: `master`,
      body: body,
      maintainer_can_modify: true,
    });

    log(`Successfully created PR: ${data.data.html_url}`);
    return data;
  } catch (err) {
    error(`Something went wrong creating a PR...`);
    error(err);

    return err;
  }
};

const bumpVersionInCask = (app) => {
  log(`Trying update for ${app.name} (${app.cask.version}) -> (${app.jetbrains.version})`);

  let commitMessage = `Update ${app.name} to ${app.jetbrains.version}`;

  if (app.cask.version === app.jetbrains.version) {
    commitMessage = `Fix sha256 of ${app.name}@${app.jetbrains.version}`;
  }

  const branch = `jcb_${app.name}_${app.jetbrains.version.replace(/\W/g, '_')}`;

  return createPR(app, branch, commitMessage);
};

const main = async () => {
  let appsWithStatus = await checkAll(definitions);

  appsWithStatus = _.sortBy(appsWithStatus, 'name');

  const upToDate = appsWithStatus.filter((x) => !x.needUpdate).map((x) => x.name);

  log(
    `${upToDate.length} of ${appsWithStatus.length} casks are up to date (${upToDate.join(', ')})`
  );

  const updateAble = appsWithStatus.filter(
    ({ needUpdate, missingAppCast }) => needUpdate || missingAppCast
  );

  let files = [];

  if (!_.isEmpty(updateAble)) {
    files = await openPRFiles();
  }

  const needUpdate = updateAble.filter((x) => x.needUpdate);

  const casks = needUpdate.filter((app) => {
    if (existsMergeRequest(files, app.filePath)) {
      log(`There already exists a Pull Request for ${app.name}\n---`);
      return false;
    }
    return true;
  });

  let hasError = await Promise.reduce(
    casks,
    (hasError, cask) =>
      bumpVersionInCask(cask).then((result) => (_.isError(result) ? true : hasError)),
    false
  );

  if (hasError) {
    warn('Jetbrains Cask Bot had an error');
    process.exit(1);
  }

  log('Jetbrains Cask Bot finished successfully');
};

main().catch((e) => {
  console.warn(e);
  process.exit(1);
});
