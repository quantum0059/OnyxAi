FROM node

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./service/Auth/package*.json ./service/Auth/
RUN cd ./service/Auth && npm install

COPY service/Auth ./service/Auth
COPY shared ./shared

WORKDIR /app/service/Auth
EXPOSE 8001
CMD ["npm","start" ]