#!/bin/bash

set -e

node ./lib/update-readme.js
./node_modules/.bin/prettier --single-quote --trailing-comma es5 --tab-width 4 --write '{lib,assets}/*.js'
