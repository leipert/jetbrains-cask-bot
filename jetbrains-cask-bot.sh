#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail; export FS=$'\n\t'

# we save the current dir to go back to it later
CURR_DIR="$(pwd)"

CASK_DIR="$(brew --repository)/Library/Taps/homebrew/homebrew-cask"

# we want to now where the project root is and switch to it
__DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Switch to project root
cd "${__DIRNAME}" || exit 1

# install dependencies
yarn

# update brew to not create PRs for outdated formulas
brew update

# read environment variables which contain git/github settings
if [[ -f "./env.sh" ]]; then
    . "./env.sh"
else
    echo "No env file found"
fi

# Switch to cask tap and setup remote
cd "${CASK_DIR}"
git fetch --unshallow origin 2> /dev/null || echo "Repo already unshallow"
git remote remove jcb 2> /dev/null || echo "No remote of the name jcb exists"
git remote add jcb \
    "https://${JCB_GITHUB_API_TOKEN}@github.com/${JCB_SOURCE_FORK_OWNER}/${JCB_TARGET_REPO}.git" > /dev/null 2>&1 \
    && echo "Added jcb remote"

# Removing old branches (only keep latest branch)
for product in $(git branch -r | grep jcb_ | cut -d_ -f 2 | sort -ur); do
    echo "Removing outdated branches for $product"
    git branch -r | grep "$product" | head -n -1 | cut -d/ -f 2 | xargs git push jcb --delete
done

# Switch to project root
cd "${__DIRNAME}" || exit 1

# run the script
echo -e "\\nRunning script\\n"
node "./lib/index.js"

# Delete remote as it contains the API token
cd "${CASK_DIR}"
git remote remove jcb 2> /dev/null || echo "No remote of the name jcb exists"

# go back to previous dir
cd "${CURR_DIR}" || exit 1
