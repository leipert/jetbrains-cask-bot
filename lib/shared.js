// const superagent = require('superagent');
const https = require('https');
const querystring = require('querystring');
const { version, repository } = require('../package.json');

const UserAgent = `JetbrainsCaskBot/${version} (+${repository})`;

const allProducts = definitions => {
  const parameters = {
    _: new Date().getTime() / 1000,
  };

  if (definitions) {
    parameters.code = definitions.map(x => x['jetbrainsCode']).join(',');
  }

  const path = '/products?' + querystring.stringify(parameters);

  const options = {
    method: 'GET',
    hostname: 'data.services.jetbrains.com',
    path,
    headers: {
      'User-Agent': UserAgent,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      console.log(`Retreived latest releases from ${options.hostname}${options.path}`);
      console.log('statusCode:', res.statusCode);
      res.setEncoding('utf8');

      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', e => {
      reject(e);
    });

    req.end();
  });
};

module.exports = {
  allProducts,
  UserAgent,
};
