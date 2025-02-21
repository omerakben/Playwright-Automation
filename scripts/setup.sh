#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting Enterprise Playwright Framework Setup...${NC}\n"

# Check Node.js installation
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

# Check npm installation
echo -e "${YELLOW}Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    exit 1
fi

# Check Docker installation
echo -e "${YELLOW}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker for database containers.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Install Playwright browsers
echo -e "${YELLOW}Installing Playwright browsers...${NC}"
npx playwright install

# Setup environment variables
echo -e "${YELLOW}Setting up environment variables...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}Created .env file from example${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

# Setup databases
echo -e "${YELLOW}Setting up databases...${NC}"
if command -v docker &> /dev/null; then
    # Start PostgreSQL container
    echo -e "${YELLOW}Starting PostgreSQL container...${NC}"
    docker-compose up -d db
    sleep 5  # Wait for database to start

    # Start MSSQL container
    echo -e "${YELLOW}Starting MSSQL container...${NC}"
    docker-compose up -d mssql
    sleep 10  # Wait for MSSQL to start

    # Verify database connections
    echo -e "${YELLOW}Verifying database connections...${NC}"

    # Test PostgreSQL connection
    if ! docker exec db pg_isready -U test_user -d test_db > /dev/null 2>&1; then
        echo -e "${RED}PostgreSQL connection failed${NC}"
        exit 1
    fi

    # Test MSSQL connection
    if ! docker exec mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Password" -Q "SELECT 1" > /dev/null 2>&1; then
        echo -e "${RED}MSSQL connection failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Docker not found. Please ensure your databases are running manually.${NC}"
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma migrate dev

# Seed database
echo -e "${YELLOW}Seeding database with test data...${NC}"
npx prisma db seed

# Create necessary directories
echo -e "${YELLOW}Creating necessary directories...${NC}"
mkdir -p test-results
mkdir -p playwright-report
mkdir -p allure-results
mkdir -p logs

# Run health check tests
echo -e "${YELLOW}Running health check tests...${NC}"
npm run test:api -- --grep "health check"

# Verify MSSQL setup
echo -e "${YELLOW}Verifying MSSQL setup...${NC}"
npm run test:api -- --grep "MSSQL Database Operations" --timeout=60000

echo -e "\n${GREEN}Setup completed successfully!${NC}"
echo -e "\nNext steps:"
echo -e "1. Review the .env file and update any necessary configurations"
echo -e "2. Check the documentation in docs/ directory"
echo -e "3. Run 'npm test' to execute all tests"
echo -e "4. Run 'npm run test:ui' to use the Playwright UI mode"

echo -e "\nDatabase Connections:"
echo -e "PostgreSQL: postgresql://test_user:test_password@localhost:5432/test_db"
echo -e "MSSQL: mssql://sa:YourStrong@Password@localhost:1433/test_db"

echo -e "\nAvailable Commands:"
echo -e "- npm test            : Run all tests"
echo -e "- npm run test:e2e    : Run E2E tests"
echo -e "- npm run test:api    : Run API tests"
echo -e "- npm run test:perf   : Run performance tests"
echo -e "- npm run test:security: Run security tests"
echo -e "- npm run test:a11y   : Run accessibility tests"
