#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -eu; export FS=$'\n\t'

cask=$1

echo "Linting cask ${cask}"
brew style --fix "${cask}"
echo "Check checksum of ${cask}"
brew audit --cask --online "${cask}"

# find out where to the dmg is downloaded, it is prompted if I run audit twice
location=$(brew audit --cask --online "${cask}" | grep -oe '/Users.*.dmg')

# get the appname (funnily it is sorrounded by brackets !?)
appname=$(brew info --cask "${cask}" | grep "(App)" | grep -oE ".+\.app")

echo "Checking if cask ${cask} contains an app named '${appname}' (${location})"

echo "Mounting ${location}"
line=$(hdiutil attach "${location}" | grep "/Volumes/")

disk=$(echo $line | cut -f1 -d " ")
volume="$( cd "$(echo $line | /usr/bin/grep -oE "/Volumes/.+")"* && pwd )"

function unmount {
  hdiutil detach "$1" || echo "Could not unmount"
}

echo "'${volume}'"
ls "${volume}"

if [ -d "${volume}/${appname}" ]; then
  echo "Cask ${cask} contains ${appname}"
  unmount "${disk}"
else
  echo "Cask ${cask} doesn't contain ${appname}"
  unmount "${disk}"
  exit 1
fi
