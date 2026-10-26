FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci  # Use ci instead of install for reproducible builds

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]