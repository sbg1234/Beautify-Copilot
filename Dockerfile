# Use Playwright's official image which includes Chromium
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/

# Run the application
CMD ["node", "dist/index.js"]
