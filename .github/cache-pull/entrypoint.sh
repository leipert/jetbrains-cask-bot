#!/bin/sh

#Publish Docker Container To GitHub Package Registry
####################################################

# exit when any command fails
set -e

#check inputs
if [[ -z "$INPUT_USERNAME" ]]; then
	echo "Set the USERNAME input."
	exit 1
fi

if [[ -z "$INPUT_PASSWORD" ]]; then
	echo "Set the PASSWORD input."
	exit 1
fi

# The following environment variables will be provided by the environment automatically: GITHUB_REPOSITORY, GITHUB_SHA
env
ls

# send credentials through stdin (it is more secure)
echo ${INPUT_PASSWORD} | docker login -u ${INPUT_USERNAME} --password-stdin docker.pkg.github.com

BASE_NAME="docker.pkg.github.com/${GITHUB_REPOSITORY}/cache:latest"

# Pull cache image
docker pull ${BASE_NAME} || echo "Cache image not found" && exit 0

ls

id=$(docker create image-name)
docker cp "$id":/cache/* .
docker rm -v "$id"

ls
