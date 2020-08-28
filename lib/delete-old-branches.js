const _ = require('lodash');
const OctoKit = require('@octokit/rest');
const Promise = require('bluebird');
const superagent = require('superagent');
const util = require('util');
const cpPromise = util.promisify(require('child_process').exec);
const { allProducts, UserAgent } = require('./shared');
const { log, warn, error } = require('./utils');

const path = require('path');
const fs = require('fs');
const octokit = new OctoKit({
  auth: `token ${process.env.JCB_GITHUB_API_TOKEN}`,
  baseUrl: 'https://api.github.com',
  userAgent: UserAgent,
  request: {
    timeout: 5000,
  },
});

const getExistingBranches = async () => {
  try {
    const { data } = await octokit.repos.listBranches({
      owner: process.env.JCB_SOURCE_FORK_OWNER,
      repo: process.env.JCB_TARGET_REPO,
      protected: false,
      per_page: 100,
    });

    return data;
  } catch (e) {
    warn('Could not load branches from github', e);
    throw e;
  }
};

const findPullRequest = async (branch) => {
  try {
    const { data } = await octokit.pulls.list({
      owner: process.env.JCB_TARGET_OWNER,
      repo: process.env.JCB_TARGET_REPO,
      head: `${process.env.JCB_SOURCE_FORK_OWNER}:${branch.name}`,
      per_page: 100,
      state: 'all',
    });

    return data;
  } catch (e) {
    warn('Could not load PRs from github', e);
    throw e;
  }
};

const deleteBranch = async (branch) => {
  await octokit.git.deleteRef({
    owner: process.env.JCB_SOURCE_FORK_OWNER,
    repo: process.env.JCB_TARGET_REPO,
    ref: `heads/${branch.name}`,
  });
};

const main = async () => {
  const branches = await getExistingBranches();

  if (branches.length === 0) {
    console.log('Found no outdated branches');
  }

  for (const branch of branches) {
    const prs = await findPullRequest(branch);

    console.log(`Checking ${branch.name}`);

    if (prs.length === 0) {
      console.log(`\tNo PR open for ${branch.name}`);
      continue;
    }

    console.log(`\tFound ${prs.length} PRs for ${branch.name}`);

    const openPrs = prs.filter((pr) => pr.state === 'open');

    if (openPrs.length === 0) {
      console.log('\tAll PRs are closed, deleting branch');
      try {
        await deleteBranch(branch);
        console.log('\tSuccessfully deleted branch');
      } catch (e) {
        warn(`\tCould not delete ${branch.name}`, e);
      }
    } else {
      console.log('\tThe following PRs are still open: ');
      console.log('\t\t' + openPrs.map((x) => x.html_url).join('\n\t\t'));
    }
  }
};

main().catch((e) => {
  console.warn(e);
  process.exit(1);
});
