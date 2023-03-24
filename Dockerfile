FROM debian:bullseye as builder

ARG NODE_VERSION=18.13.0

RUN apt-get update && apt-get install -y curl pkg-config build-essential
RUN curl https://get.volta.sh | bash
ENV VOLTA_HOME /root/.volta
ENV PATH /root/.volta/bin:$PATH
RUN volta install node@${NODE_VERSION}

#######################################################################

RUN mkdir /app
WORKDIR /app

# NPM will not install any package listed in "devDependencies" when NODE_ENV is set to "production",
# to install all modules: "npm install --production=false".
# Ref: https://docs.npmjs.com/cli/v9/commands/npm-install#description

ENV NODE_ENV production

COPY . .

RUN npm install
FROM debian:bullseye

LABEL fly_launch_runtime="nodejs"

COPY --from=builder /root/.volta /root/.volta
COPY --from=builder /app /app

RUN apt-get update -y && apt-get install -y libreoffice-java-common libreoffice-writer
RUN ln /app/public/fonts/TW-Kai-98_1.ttf /usr/local/share/fonts/TW-Kai-98_1.ttf
RUN ln /app/30-cjk-aliases.conf /etc/fonts/conf.d/30-cjk-aliases.conf

WORKDIR /app
ENV NODE_ENV production
ENV PATH /root/.volta/bin:$PATH

CMD [ "npm", "run", "start" ]
