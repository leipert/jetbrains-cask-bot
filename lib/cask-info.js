const fs = require('fs');
const { log } = require('./utils');
const { octokit, cpPromise } = require('./shared');

const getCaskField = (cask, field) => {
  const regex = new RegExp(`${field}\\s+(["'])(.+)\\1\\s*$`, 'gm');
  const match = regex.exec(cask);

  return match[2];
};

const getCaskPathPromise = async (caskName) => {
  let result = await cpPromise(
    `find "$(brew --repository)/Library/Taps/homebrew" -name "${caskName}.rb"`
  );
  return result.stdout.replace(/\r?\n+/gi, '');
};

const parseCask = ({ cask, jetbrainsCode, releaseChannel }) => ({
  version: getCaskField(cask, 'version'),
  sha256: getCaskField(cask, 'sha256'),
  appcast: getCaskField(cask, 'appcast'),
  url: getCaskField(cask, 'url'),
  appcastGenerated: `https://data.services.jetbrains.com/products/releases?code=${jetbrainsCode}&latest=true&type=${releaseChannel}`,
});

const getLocalCask = async ({ caskName, jetbrainsCode, releaseChannel }) => {
  const filePath = await getCaskPathPromise(caskName);

  log(`\t Retrieved cask data for ${caskName} locally: ${filePath}`);
  const cask = fs.readFileSync(filePath, 'utf8');

  return { ...parseCask({ cask, jetbrainsCode, releaseChannel }), filePath };
};

const getRemoteCask = async ({ caskName, jetbrainsCode, releaseChannel }) => {
  const { data } = await octokit.repos.getContent({
    owner: 'caskroom',
    repo: 'homebrew-cask',
    path: `Casks/${caskName}.rb`,
    per_page: 100,
  });

  const cask = Buffer.from(data.content, 'base64').toString();

  log(`\t Retrieved cask data for ${caskName} from GitHub`);

  return parseCask({ cask, jetbrainsCode, releaseChannel });
};

module.exports = {
  getLocalCask,
  getRemoteCask,
};
