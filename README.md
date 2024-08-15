 🌟 Ray-Ban AI Assistant

Welcome to the Ray-Ban AI Assistant project! This application is designed to work seamlessly with Meta's Ray-Ban smart glasses, leveraging WhatsApp as an interface to interact with advanced AI models. This project provides users with a hands-free AI assistant experience.

🚀 Features
AI-Powered Text and Image Analysis
Utilize state-of-the-art AI models like GPT and Claude for analyzing text and images.
WhatsApp Integration
Interact with the AI assistant directly via WhatsApp messages.
Voice Command Support
Switch AI models using simple voice commands, enhanced to handle punctuation.
Secure and Scalable Architecture
Dockerized setup with Redis and Nginx for robust performance.
📋 Table of Contents
Getting Started
Installation
Usage
Configuration
Architecture
Contributing
License
🏁 Getting Started
Follow these instructions to set up and run the Ray-Ban AI Assistant on your local machine.

Prerequisites
Docker
Node.js (v14+ recommended)
npm
Installation
Clone the repository:

bash
Copy code
git clone https://github.com/yourusername/ray-ban-ai-assistant.git
cd ray-ban-ai-assistant
Install dependencies:

bash
Copy code
npm install
Set up environment variables:

Create a .env file in the root directory and configure the following variables:

plaintext
Copy code
PORT=3000                           # Port on which the app will run
WHATSAPP_TOKEN=your_whatsapp_token  # Your WhatsApp Business API token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_INCOMING_PHONE_NUMBER=your_incoming_phone_number
OPENAI_API_KEY=your_openai_api_key  # OpenAI API key for accessing GPT models
ANTHROPIC_KEY=your_anthropic_key    # Anthropic API key for accessing Claude models
REDIS_URL=redis://localhost:6379    # Redis server URL
WHATSAPP_VERIFY_TOKEN=your_verify_token
AUTHORIZED_WHATSAPP_NUMBER=your_authorized_number
REDIS_PASSWORD=your_redis_password  # Password for Redis if applicable
Build and run Docker containers:

bash
Copy code
docker-compose up --build
⚙️ Usage
To interact with the Ray-Ban AI Assistant, simply send a message through WhatsApp to your configured phone number. You can switch AI models, send images for analysis, or ask any questions to get AI-generated responses.

Commands
Switch AI Model:

plaintext
Copy code
switch to [model alias]
Aliases:

4o -> GPT-4o
mini -> GPT-4o-mini
opus -> Claude-3 Opus
sonnet -> Claude-3.5 Sonnet
Send Image for Analysis:

Simply attach an image to your WhatsApp message.

🛠️ Configuration
The Ray-Ban AI Assistant is highly configurable, allowing you to adjust its behavior and connected services.

|Environment Variables|
Variable	Description
PORT	The port number on which the application will run
WHATSAPP_TOKEN	Your WhatsApp Business API token
WHATSAPP_PHONE_NUMBER_ID	The ID of the phone number configured in WhatsApp
WHATSAPP_INCOMING_PHONE_NUMBER	The incoming phone number used to send and receive messages
OPENAI_API_KEY	API key for accessing OpenAI's models
ANTHROPIC_KEY	API key for accessing Anthropic's Claude models
REDIS_URL	The URL of the Redis server used for session management
WHATSAPP_VERIFY_TOKEN	The verification token for WhatsApp webhook validation
AUTHORIZED_WHATSAPP_NUMBER	The authorized WhatsApp number allowed to communicate with the bot
REDIS_PASSWORD	Password for accessing the Redis server if required

Customization
You can customize the AI models by modifying the MODEL_ALIASES in the messageController.ts to suit different AI model versions or APIs.

🏗️ Architecture

The Ray-Ban AI Assistant utilizes a microservices architecture with the following key components:

Backend Services:
Handles AI interactions and message processing.
AI Model Integrations:
Supports multiple AI models like GPT and Claude.
Redis:
Manages user sessions and conversation histories.
Nginx:
Manages HTTP traffic and load balancing.
Docker:
Containerized deployment for consistency and scalability.
🤝 Contributing
We welcome contributions to enhance the Ray-Ban AI Assistant. Please follow these guidelines to contribute:

Fork the repository
Create a new branch (git checkout -b feature/your-feature)
Commit your changes (git commit -am 'Add new feature')
Push to the branch (git push origin feature/your-feature)
Create a Pull Request
Code of Conduct
Please adhere to our Code of Conduct while contributing.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
