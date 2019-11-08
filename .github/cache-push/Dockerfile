FROM docker:19.03.2 as runtime

LABEL "com.github.actions.name"="Publish a docker image as a cache image"
LABEL "com.github.actions.description"="Publish a docker image as a cache image"
LABEL "com.github.actions.icon"="layers"
LABEL "com.github.actions.color"="purple"

ADD entrypoint.sh /entrypoint.sh

RUN apk add --update --no-cache git \
  && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
