#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail; export FS=$'\n\t'

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

caskroom_dir=$1
cask=$2
branch=$3
message=$4

echo "Auditing cask ${cask}"
bash "${DIR}/audit.sh" "${cask}"
echo "Creating branch for ${cask}"
cd "${caskroom_dir}"
git checkout -b "${branch}" --quiet
git commit "${cask}.rb" --message "${message}" --quiet
git push --force jcb "${branch}" --quiet
git checkout master
