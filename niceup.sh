#!/bin/bash

node ./lib/update-readme.js
prettier --single-quote --write '{lib,assets}/*.js'
