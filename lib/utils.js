const chalk = require('chalk');

module.exports = {
  warn: (message, ...args) => {
    console.log(chalk.yellow(message), ...args);
  },
  error: (message, ...args) => {
    console.log(chalk.red(message), ...args);
  },
  log: (message, ...args) => {
    console.log(message, ...args);
  },
};
