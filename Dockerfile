# Use a smaller base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Define the command to run your application
CMD ["node", "dist/index.js"]
