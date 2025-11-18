# AI-NFT Platform - Backend Server

Node.js + TypeScript + Express server for the AI-NFT Platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed

### Setup

```bash
# Install dependencies
npm install

# Run development server (with hot-reload)
npm run dev

# Or use the alias
npm run server

# Build for production
npm build

# Run production build
npm start
```

## 📁 Project Structure

```
server/
├── src/
│   └── index.ts          # Main server file
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 🔧 Available Scripts

- `npm run dev` / `npm run server` - Start dev server with auto-reload (uses nodemon + ts-node)
- `npm run build` - Compile TypeScript to JavaScript in `dist/`
- `npm start` - Run compiled production build

## 🌐 Endpoints

- `GET /` - Welcome message
- `GET /hello` - Returns JSON with "Hello World"
- `GET /health` - Health check endpoint

## 📝 Hot-Reload

The dev server uses **nodemon** + **ts-node** to automatically restart when you save any file changes. Just edit a file and save—the server will restart instantly with your changes.

## 🏗️ Next Steps

1. Add database connection
2. Create route handlers in separate files
3. Add environment variables (.env)
4. Implement authentication
5. Add error handling middleware
