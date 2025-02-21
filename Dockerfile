# Use Node.js as base image
FROM node:20-slim

# Set environment variables
ENV PLAYWRIGHT_VERSION=1.50.1
ENV ALLURE_VERSION=2.24.1
ENV K6_VERSION=0.47.0
ENV ZAP_VERSION=2.14.0

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    default-jre \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright system dependencies
RUN npx playwright install-deps

# Install Allure
RUN curl -o allure.tgz -Ls https://github.com/allure-framework/allure2/releases/download/${ALLURE_VERSION}/allure-${ALLURE_VERSION}.tgz \
    && tar -zxvf allure.tgz -C /opt \
    && ln -s /opt/allure-${ALLURE_VERSION}/bin/allure /usr/local/bin/allure \
    && rm allure.tgz

# Install k6
RUN curl -L https://github.com/grafana/k6/releases/download/v${K6_VERSION}/k6-v${K6_VERSION}-linux-amd64.tar.gz -o k6.tar.gz \
    && tar -zxvf k6.tar.gz \
    && mv k6-v${K6_VERSION}-linux-amd64/k6 /usr/local/bin/k6 \
    && rm -rf k6-v${K6_VERSION}-linux-amd64 k6.tar.gz

# Pull ZAP Docker image
RUN docker pull owasp/zap2docker-stable:${ZAP_VERSION}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install

# Copy project files
COPY . .

# Create directories for test results
RUN mkdir -p test-results allure-results reports

# Set environment variables for test execution
ENV CI=true
ENV NODE_ENV=test

# Command to run tests
CMD ["npm", "run", "test"]
