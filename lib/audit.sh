#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -eu; export FS=$'\n\t'

cask=$1

echo "Linting cask ${cask}"
brew cask style --fix "${cask}"
echo "Check checksum of ${cask}"
brew cask audit --download "${cask}"

# find out where to the dmg is downloaded, it is prompted if i run audit twice
location=$(brew cask audit --download "${cask}" | grep -oe '/Users.*.dmg')

# get the appname (funnily it is sorrounded by brackets !?)
appname=$(brew cask _stanza app "${cask}" | sed 's/\[\["//' | sed 's/"\]\]//')

echo "Checking if cask ${cask} contains an app named '${appname}' (${location})"

if 7z l "${location}" | grep -q "/${appname}/Contents" ; then
	echo "Cask ${cask} contains ${appname}"
else
  echo "ERROR: Cask ${cask} does not contain ${appname}"
  7z l "${location}"
	exit 1
fi
