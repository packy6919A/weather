# DOCKER Version 1.0
FROM tensorflow/tensorflow:2.3.1-gpu

EXPOSE 8080

#RUN groupadd --gid 1000 node \
#  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NODE_VERSION 14.14.0

RUN mkdir -p /weather/web/src/assets/css
RUN mkdir -p /weather/webservices

ADD webservices/*.js   /weather/webservices/
ADD webservices/data.*   /weather/webservices/

RUN apt-get update -y && \
    apt-get dist-upgrade -y && \
    apt-get install -y sudo && \
    apt-get install -y vim && \
    set -ex && \
    for key in \
      4ED778F539E3634C779C87C6D7062848A1AB005C  \
      94AE36675C464D64BAFA68DD7434390BDBE9B9C5  \
      1C050899334244A8AF75E53792EF661D867B9DFA  \
      71DCFD284A79C3B38668286BC97EC7A07EDE3FC1  \
      8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600  \
      C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8  \
      C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C  \
      DD8F2338BAE7501E3DD5AC78C273792F7D83545D  \
      A48C2BEE680E841632CD4E44F07496B3EB3C1762  \
      108F52B48DB57BB0CC439B2997B01419BD92F80A  \
      B9E2F5981AA6E0CD28160D9FF13993A75599653C  \
    ; do  \
      gpg --batch --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys "$key" ||  \
      gpg --batch --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys "$key" ||  \
      gpg --batch --keyserver hkp://pgp.mit.edu:80 --recv-keys "$key" ; \
    done  && \
#    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash - && \
    curl -fsSLO --compressed  "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" && \
    curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" && \
    gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc && \
    grep " node-v$NODE_VERSION-linux-x64.tar.xz\$" SHASUMS256.txt | sha256sum -c - && \
    tar -xJf "node-v$NODE_VERSION-linux-x64.tar.xz" -C /usr/local --strip-components=1 --no-same-owner && \
    rm "node-v$NODE_VERSION-linux-x64.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt && \
    ln -s /usr/local/bin/node /usr/local/bin/nodejs && \
    node --version &&  \
    npm --version && \
#    apt-get install nodejs -y && \
#    npm install && \
    npm cache clean --force && \
    npm install  axios && \
    npm install  express     && \
    npm install  body-parser && \
    npm install  https && \
    npm install  csv-parser && \
    npm install  fs && \
    npm install  cors && \
    npm install -g @vue/cli && \
    npm install mongodb

WORKDIR /weather

RUN vue create web -f -d

ADD web/*.js* /weather/web/
ADD web/src/assets/css/tailwind.css /weather/web/src/assets/css/
ADD web/src/App.vue /weather/web/src/
ADD web/src/main.js  /weather/web/src/
ADD web/src/postcss.config.js /weather/web/src/

RUN npm install --save -y vue-google-autocomplete

