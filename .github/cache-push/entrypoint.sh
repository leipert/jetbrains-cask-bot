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

if [[ -z "$INPUT_CACHE_PATH" ]]; then
	echo "Set the CACHE_PATH input."
	exit 1
fi

# The following environment variables will be provided by the environment automatically: GITHUB_REPOSITORY, GITHUB_SHA
env
ls

# send credentials through stdin (it is more secure)
echo ${INPUT_PASSWORD} | docker login -u ${INPUT_USERNAME} --password-stdin docker.pkg.github.com

# Set Local Variables
BASE_NAME="docker.pkg.github.com/${GITHUB_REPOSITORY}/cache:latest"

TMP_FILE="/tmp/Dockerfile"

cat > ${TMP_FILE} << EOL
FROM scratch

COPY $INPUT_CACHE_PATH /cache/

EOL

cat ${TMP_FILE}

# Build The Container
docker build -t ${BASE_NAME} -f ${TMP_FILE} .

rm -f ${TMP_FILE}

# Push cache image
docker push ${BASE_NAME}

echo "::set-output name=IMAGE_URL::${BASE_NAME}"

exit 1
