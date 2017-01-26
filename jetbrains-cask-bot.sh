#!/bin/bash

. ./env.sh

brew update
yarn
node ./lib/index.js
