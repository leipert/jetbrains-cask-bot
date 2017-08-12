#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail; export FS=$'\n\t'

caskroom_dir=$1
cask=$2
branch=$3
message=$4

cd "${caskroom_dir}"
echo "Linting cask ${cask}"
brew cask style --fix "${cask}"
echo "Auditing cask ${cask}"
brew cask audit --download "${cask}"
echo "Creating branch for ${cask}"
git checkout -b "${branch}" --quiet
git commit "${cask}.rb" --message "${message}" --quiet
git push --force jcb "${branch}" --quiet
git checkout master
