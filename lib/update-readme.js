const fs = require('fs');
const _ = require('lodash');
const path = require('path');

const file = path.join(__dirname, '..', 'README.md');

let README = fs.readFileSync(file, 'utf8');

const definitions = require('../assets/definitions');

const products = _.map(definitions, ({ caskName, releaseChannel }) => {
    const addition =
        releaseChannel !== 'release' ? ` (${releaseChannel} channel)` : '';

    return `-   ${caskName}${addition}`;
});

README = README.replace(
    /<!-- JETBRAINS -->([\s\S]+)<!-- JETBRAINS END -->/gim,
    `<!-- JETBRAINS -->\n${products.join('\n')}\n<!-- JETBRAINS END -->`
);

fs.writeFileSync(file, README);
