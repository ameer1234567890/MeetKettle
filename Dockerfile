FROM node:20-alpine

RUN apk update && \
    apk add --no-cache --update tzdata tini

COPY . /kettle
WORKDIR /kettle
RUN npm install

EXPOSE 6338

ENTRYPOINT ["tini", "--"]
CMD [ "node", "index.js" ]
