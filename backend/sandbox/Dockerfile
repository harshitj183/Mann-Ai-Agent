FROM node:20-alpine

# Install Chromium and its runtime dependencies for puppeteer-core.
# Also install font packages so rendered PDFs/images have readable text.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-cjk \
    udev

# Tell puppeteer-core where to find Chromium.
ENV CHROMIUM_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY src ./src

EXPOSE 3006

CMD ["npm", "start"]
