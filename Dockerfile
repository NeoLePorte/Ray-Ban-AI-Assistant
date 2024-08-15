# Use a Node.js image based on Debian
FROM node:18-bullseye-slim

# Set the working directory
WORKDIR /usr/src/app

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    libc6 \
    libgcc1 \
    libstdc++6 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the necessary port
EXPOSE 3000

# Command to run your application
CMD ["npm", "run", "dev"]
