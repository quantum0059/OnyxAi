FROM node

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./services/Agents/package*.json ./services/Agents/
RUN cd ./services/Agents && npm install

COPY services/Agents ./services/Agents
COPY shared ./shared

WORKDIR /app/services/Agents
EXPOSE 8003
CMD ["npm","start" ]