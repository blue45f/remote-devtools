# Remote Debug Tools Docker Configuration

FROM node:22.6.0

ARG APP
ENV APP=${APP}

WORKDIR /usr/src/app

RUN mkdir -p /app/data
RUN mkdir -p /app/logs

# Playwright 의존성 설치
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Playwright 브라우저 설치
RUN npx playwright install chromium

CMD ["npm", "run", "start:container"]
