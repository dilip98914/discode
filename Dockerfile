FROM node:18-bullseye

# Explicitly install local compilers and runtimes for sandbox execution
RUN apt-get update && apt-get install -y --no-install-recommends python3 gcc g++ curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/discode

COPY . .

RUN npm install
WORKDIR /usr/src/discode/frontend
RUN npm install
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

RUN curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-amd64
RUN chmod +x /usr/local/bin/dbmate
WORKDIR /usr/src/discode

CMD ["sh", "-c", "dbmate wait && dbmate migrate && npm start"]
