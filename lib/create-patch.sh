#!/bin/bash

caskroom_dir=$1
cask=$2
branch=$3
version=$4

cd "${caskroom_dir}" || exit 1
brew cask style --fix "${cask}"
brew cask audit --download "${cask}"
git checkout -b "${branch}" --quiet
git commit "${cask}.rb" --message "Update ${cask} to ${version}" --quiet
git push --force jcb "${branch}" --quiet
git checkout master