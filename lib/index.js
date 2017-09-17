const _ = require('lodash');
const GitHubApi = require('github');
const Promise = require('bluebird');
const superagent = require('superagent');
const cpPromise = require('child-process-promise').exec;
const cs = require('cache-service');
const fileCache = require('cache-service-file-cache')({
    key: 'jetbrains-cask-bot',
    maxRetries: 8,
    verbose: true,
    defaultExpiration: 10 * 60,
});
const cacheService = new cs({ verbose: false }, [fileCache]);
const superagentCache = require('superagent-cache-plugin')(cacheService);

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
    timeout: 5000,
});

github.authenticate({ type: 'token', token: process.env.JCB_GITHUB_API_TOKEN });

const getOpenPRs = () => {
    return github.pullRequests
        .getAll({
            owner: 'caskroom',
            repo: 'homebrew-cask',
            per_page: 100,
        })
        .then(res => res.data);
};

const getPRFiles = prNum => {
    return github.pullRequests
        .getFiles({
            owner: 'caskroom',
            repo: 'homebrew-cask',
            number: prNum,
        })
        .then(res => res.data);
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

const getAppCastCheckpoint = function(caskName, calculate) {
    return cpPromise(
        `brew cask _appcast_checkpoint ${caskName} ${calculate
            ? '--calculate'
            : ''}`
    ).then(result => {
        return result.stdout.replace(/\r?\n+/gi, '');
    });
};

const getCaskVersionOfApp = function({
    caskName,
    jetbrainsCode,
    releaseChannel,
}) {
    return cachePromise(`${caskName}-cask`, 24 * 60 * 60, () =>
        Promise.props({
            version: getCaskField(caskName, 'version'),
            sha256: getCaskField(caskName, 'sha256'),
            appcast: getCaskField(caskName, 'appcast'),
            appcastGenerated: `https://data.services.jetbrains.com/products/releases?code=${jetbrainsCode}&latest=true&type=${releaseChannel}`,
            appcastCheckpoint: getAppCastCheckpoint(caskName),
        })
    );
};

const getJBVersionOfApp = function(
    jetbrains,
    { jetbrainsCode, versionField, releaseChannel }
) {
    const releases = _.get(
        _.find(jetbrains, { code: jetbrainsCode }),
        'releases',
        []
    );

    const jb = _.find(releases, { type: releaseChannel });

    if (releaseChannel !== 'release' && jb) {
        const latestStable = _.get(
            _.find(releases, { type: 'release' }),
            'date',
            '1970-01-01'
        );

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
        appcastCurrentCheckpoint: getAppCastCheckpoint(app.caskName, true),
        filePath: getCaskPathPromise(app.caskName),
    }).then(({ name, cask, jetbrains, appcastCurrentCheckpoint, filePath }) => {
        cask.appcastCurrentCheckpoint = appcastCurrentCheckpoint;
        return {
            name,
            cask,
            jetbrains,
            filePath,
            missingAppCast: !_.isEqual(cask.appcast, cask.appcastGenerated),
            appcastNeedUpdate: !_.isEqual(
                cask.appcastCheckpoint,
                cask.appcastCurrentCheckpoint
            ),
            needUpdate: !(
                _.isEqual(cask.version, jetbrains.version) &&
                _.isEqual(cask.sha256, jetbrains.sha256)
            ),
        };
    });
};

const invalidateCaches = (definitions, products) => {
    const promises = _.reduce(
        definitions,
        (result, cask) => {
            result[cask.caskName] = getCaskPathPromise(cask.caskName)
                .then(path => path.replace(/\r?\n+/gi, ''))
                .then(path => fs.lstatSync(path).mtime.getTime());
            return result;
        },
        {}
    );

    return Promise.all([
        Promise.fromCallback(fileCache.get.bind(null, 'mtimes')),
        Promise.props(promises),
    ])
        .then(mtimesArray => {
            const oldTimes = mtimesArray[0];
            const newTimes = mtimesArray[1];

            const delKeys = _.chain(definitions)
                .map('caskName')
                .reject(
                    caskName =>
                        _.get(oldTimes, caskName, true) ===
                        _.get(newTimes, caskName, false)
                )
                .map(caskName => `${caskName}-cask`)
                .value();

            console.warn(delKeys);

            fileCache.del(delKeys);

            fileCache.set('mtimes', newTimes, 60 * 60 * 24 * 3);
        })
        .then(() => products);
};

const checkAll = definitions => {
    console.log('Retrieving latest releases from jetbrains...');

    return superagent
        .get('https://data.services.jetbrains.com/products')
        .use(superagentCache)
        .set('User-Agent', UserAgent)
        .query({
            _: new Date().getTime() / 1000,
            code: _.map(definitions, 'jetbrainsCode').join(','),
        })
        .pruneQuery(['_'])
        .prune(function(response) {
            return {
                body: response.body,
                path: response.req.path,
            };
        })
        .then(result => {
            console.log(`Retreived latest releases from ${result.path}`);

            const jetbrains = result.body;
            return jetbrains;
        })
        .then(invalidateCaches.bind(null, definitions))
        .then(products =>
            Promise.all(_.map(definitions, getStatus.bind(null, products)))
        );
};

const existsMergeRequest = (files, filePath) =>
    _.some(files, file => _.endsWith(filePath, file));

const cachePromise = (key, time, fn) => {
    const promiseToBeCached = fn ? fn : time;
    const timeInSeconds = fn ? time : undefined;
    return Promise.fromCallback(fileCache.get.bind(null, key)).then(cached => {
        if (cached !== null) {
            return cached;
        }
        return promiseToBeCached().then(result => {
            fileCache.set(key, result, timeInSeconds);
            return result;
        });
    });
};

const getMissingCasks = definitions => {
    return cachePromise('missing-casks', 60 * 60 * 24 * 3, () =>
        cpPromise(`brew cask _stanza url --table | grep jetbrains`)
            .then(result => result.stdout)
            .then(result => {
                return _.chain(result)
                    .split(/\r?\n+/gi)
                    .reject(_.isEmpty)
                    .map(line => line.split('\t'))
                    .reject(line =>
                        _.some(definitions, ({ caskName }) =>
                            _.endsWith(line[0], caskName)
                        )
                    )
                    .value();
            })
    )
        .then(missingCasks => {
            _.forEach(missingCasks, cask => {
                console.log(`Missing ${cask[0]} definition for ${cask[1]}`);
            });
        })
        .catch(() => {
            console.log('Could not load missing casks.');
        });
};

const getCaskPathPromise = caskName => {
    return cpPromise(
        `find "$(brew --repository)/Library/Taps/caskroom"  -name "${caskName}.rb"`
    ).then(result => result.stdout.replace(/\r?\n+/gi, ''));
};

const bumpVersionInCask = app => {
    console.log(
        `Trying update for ${app.name} (${app.cask.version}) -> (${app.jetbrains
            .version})`
    );

    let commitMessage = `Update ${app.name} to ${app.jetbrains.version}`;

    if (app.cask.version === app.jetbrains.version) {
        commitMessage = `Fix sha256 of ${app.name}@${app.jetbrains.version}`;
    }

    const branch = `jcb_${app.name}_${app.jetbrains.version.replace(
        /\W/g,
        '_'
    )}`;

    return Promise.resolve(app.filePath)
        .then(filePath => {
            console.log(`\tFound Cask File: ${filePath}`);

            let caskFile = fs.readFileSync(filePath, 'utf8');

            caskFile = caskFile
                .replace(/(version\s+').+?(')/g, `$1${app.jetbrains.version}$2`)
                .replace(
                    /(appcast\s+').+?(',)/,
                    `$1${app.cask.appcastGenerated}$2`
                )
                .replace(
                    /(checkpoint:\s+').+?(')/g,
                    `$1${app.cask.appcastCurrentCheckpoint}$2`
                )
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
            let body = fs.readFileSync(
                path.join(__dirname, '../assets', 'PR_TEMPLATE.md'),
                'utf8'
            );

            if (app.cask.version === app.jetbrains.version) {
                body += `\nApparently jetbrains changed the release artifact for ${app.name}@${app
                    .jetbrains.version}.\n`;
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
        })
        .catch(function(err) {
            console.error(`Something went wrong creating a PR...`);
            console.error(err);
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
            `${_.size(latest)} of ${_.size(
                appsWithStatus
            )} casks are up to date (${latest.join(', ')})`
        );

        return _.filter(
            appsWithStatus,
            ({ needUpdate, missingAppCast, appcastNeedUpdate }) =>
                needUpdate || missingAppCast || appcastNeedUpdate
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
            missingCasks: getMissingCasks(definitions),
        };
    })
    .then(Promise.props)
    .then(({ updateAble, files }) => {
        const needUpdate = _.filter(updateAble, 'needUpdate');
        const ableToUpdate = _.reject(needUpdate, app => {
            if (existsMergeRequest(files, app.filePath)) {
                console.log(
                    `There already exists a Pull Request for ${app.name}\n---`
                );
                return true;
            }
            return false;
        });
        return ableToUpdate;
    })
    .then(casks => {
        return Promise.reduce(
            casks,
            function(total, cask) {
                return bumpVersionInCask(cask);
            },
            0
        );
    })
    .then(() => console.log('Jetbrains Cask Bot finished'));
