const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const Promise = require('bluebird');

const { octokit, cpPromise } = require('./shared');
const getOutdatedCasks = require('./outdated-casks');
const { getLocalCask } = require('./cask-info');
const { log, warn, error } = require('./utils');

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
    warn(`Could not load PR files (#${prNum}) from github`, e);
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

const existsMergeRequest = (files, filePath) => files.some((file) => filePath.endsWith(file));

const createPatch = async (app, branch, commitMessage) => {
  try {
    const filePath = app.filePath;
    log(`\tFound Cask File: ${filePath}`);

    let caskFile = fs.readFileSync(filePath, 'utf8');

    caskFile = caskFile
      .replace(/(url\s+(['"])).+?(\2)/g, `$1${app.jetbrains.urlTemplate}$2`)
      .replace(/(version\s+(['"])).+?(\2)/g, `$1${app.jetbrains.version}$2`)
      .replace(/(appcast\s+(['"])).+?(\2,?)/, `$1${app.cask.appcastGenerated}$2`)
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
  const updateAble = await getOutdatedCasks(getLocalCask);

  let files = [];

  if (!_.isEmpty(updateAble)) {
    files = await openPRFiles();
  }

  const casks = updateAble.filter((app) => {
    if (existsMergeRequest(files, app.filePath)) {
      log(`There already exists a Pull Request for ${app.name}\n---`);
      return false;
    }
    return true;
  });

  const hasError = await Promise.reduce(
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
