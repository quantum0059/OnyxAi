FROM node

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./services/Payment/package*.json ./services/Payment/
RUN cd ./services/Payment && npm install

COPY services/Payment ./services/Payment
COPY shared ./shared

WORKDIR /app/services/Payment
EXPOSE 8004
CMD ["npm","start" ]