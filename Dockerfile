FROM node:20

RUN mkdir -p /usr/app

WORKDIR /usr/app

COPY src/ .

RUN npm install

CMD ["npm", "run", "prod"]