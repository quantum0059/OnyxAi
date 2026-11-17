FROM node

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./services/Chat/package*.json ./services/Chat/
RUN cd ./services/Chat && npm install

COPY services/Chat ./services/Chat
COPY shared ./shared

WORKDIR /app/services/Chat
EXPOSE 8002
CMD ["npm","start" ]