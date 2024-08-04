# Dockerfile

FROM node:18-alpine

# Set environment variables
ENV MEDIA_STORAGE_PATH /var/www/ray-ban-ai-assistant/tmp

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Create the directory for storing media
RUN mkdir -p /var/www/ray-ban-ai-assistant/tmp

# Expose the application's port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
