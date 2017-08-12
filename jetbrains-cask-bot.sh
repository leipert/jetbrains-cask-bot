#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail; export FS=$'\n\t'

# we save the current dir to go back to it later
CURR_DIR="$(pwd)"

# we want to now where the project root is and switch to it
__DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "${__DIRNAME}" || exit 1

# install dependencies
yarn

# update brew to not create PRs for outdated formulas
brew update

# read environment variables which contain git/github settings
. "./env.sh"

# run the script
node "./lib/index.js"

# go back to previous dir
cd "${CURR_DIR}" || exit 1
