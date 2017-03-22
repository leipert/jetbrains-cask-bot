#!/bin/bash

set -e

caskroom_dir=$1
cask=$2
branch=$3
message=$4

cd "${caskroom_dir}"
brew cask style --fix "${cask}"
brew cask audit --download "${cask}"
git checkout -b "${branch}" --quiet
git commit "${cask}.rb" --message "${message}" --quiet
git push --force jcb "${branch}" --quiet
git checkout master