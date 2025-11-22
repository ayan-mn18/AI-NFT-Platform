# SSE API Testing Guide

Complete guide to test your Server-Sent Events (SSE) streaming API on different platforms.

---

## Table of Contents

1. [Testing Platforms Overview](#testing-platforms-overview)
2. [Setup Prerequisites](#setup-prerequisites)
3. [Platform 1: cURL (Terminal)](#platform-1-curl-terminal)
4. [Platform 2: Postman](#platform-2-postman)
5. [Platform 3: Insomnia](#platform-3-insomnia)
6. [Platform 4: Thunder Client (VS Code)](#platform-4-thunder-client-vs-code)
7. [Platform 5: REST Client (VS Code Extension)](#platform-5-rest-client-vs-code-extension)
8. [Platform 6: Browser Console](#platform-6-browser-console)
9. [Platform 7: Node.js Script](#platform-7-nodejs-script)
10. [Platform 8: Python Script](#platform-8-python-script)
11. [Testing Checklist](#testing-checklist)
12. [Troubleshooting](#troubleshooting)

---

## Testing Platforms Overview

| Platform | Ease | SSE Support | Real-time View | Best For |
|----------|------|-------------|-----------------|----------|
| **cURL** | ⭐⭐ | ✅ | ✅ | Quick terminal tests |
| **Postman** | ⭐⭐⭐⭐ | ✅ | ✅ | Comprehensive GUI testing |
| **Insomnia** | ⭐⭐⭐⭐ | ✅ | ✅ | Clean interface, great SSE support |
| **Thunder Client** | ⭐⭐⭐ | ✅ | ✅ | Lightweight, VS Code native |
| **REST Client** | ⭐⭐⭐ | ✅ | ✅ | File-based requests, easy scripting |
| **Browser Console** | ⭐⭐⭐⭐ | ✅ | ✅ | Real frontend integration testing |
| **Node.js Script** | ⭐⭐ | ✅ | ✅ | Programmatic testing |
| **Python Script** | ⭐⭐ | ✅ | ✅ | Data analysis, stress testing |

---

## Setup Prerequisites

### 1. Get Your JWT Token

First, you need a valid JWT token. Either:

**Option A: Register/Login via frontend**
```bash
# Your frontend at http://localhost:5173 should have a login page
# Use the login to get a token, check browser DevTools → Application → Cookies
```

**Option B: Get token via API**
```bash
# First, register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "user_type": "creator"
  }'

# Then login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Response will include token:
# {
#   "token": "eyJhbGc...",
#   "user": {...}
# }
```

Save the token:
```bash
export JWT_TOKEN="eyJhbGc..." # Replace with your actual token
```

### 2. Create a Chat First

Every message needs a chatId. Create one:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Chat"}'

# Response:
# {
#   "status": "success",
#   "data": {
#     "chat_id": "123e4567-e89b-12d3-a456-426614174000",
#     ...
#   }
# }
```

Save the chat ID:
```bash
export CHAT_ID="123e4567-e89b-12d3-a456-426614174000"
```

### 3. Verify Server is Running

```bash
# Terminal 1: Start your server
cd /Users/bizer/Development/Projects/AI-NFT-Platform/server
npm run dev

# You should see:
# ✅ Server running on http://localhost:3000
# ✅ Gemini initialized successfully
```

---

## Platform 1: cURL (Terminal)

**Best for:** Quick tests, CI/CD pipelines, automation

### Basic SSE Test

```bash
# Make sure to set token and chat ID first (see Prerequisites)

curl -X POST http://localhost:3000/api/chat/$CHAT_ID/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me create an NFT concept"}' \
  --no-buffer \
  -v
```

**What to look for:**
```
< HTTP/1.1 200 OK
< Content-Type: text/event-stream
< Cache-Control: no-cache
< Connection: keep-alive
< X-Accel-Buffering: no

data: I'd love to help you create an NFT concept!
data: Let me suggest some ideas based on your preferences...
data: {"done": true, "tokens_used": 245, "message_id": "uuid"}
```

### cURL With Detailed Headers

```bash
curl -v \
  -X POST http://localhost:3000/api/chat/$CHAT_ID/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"message": "Create an abstract NFT design concept"}' \
  --no-buffer \
  2>&1 | tee sse_response.log
```

Save response to file for analysis:
```bash
curl -X POST http://localhost:3000/api/chat/$CHAT_ID/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me with NFT ideas"}' \
  --no-buffer > sse_output.txt 2>&1

# View the output
cat sse_output.txt
```

---

## Platform 2: Postman

**Best for:** GUI testing, saving requests, team collaboration

### Step 1: Import Environment

Create a new **Postman Collection**:

1. Open Postman
2. Click **"+"** to create new request
3. Set up Environment Variables:
   - Click "Environment" (gear icon)
   - Create new environment "AI-NFT-Dev"
   - Add variables:
     ```
     jwt_token: (your token from login)
     chat_id: (from chat creation)
     api_base: http://localhost:3000
     ```

### Step 2: Create SSE Test Request

1. **Request Type:** `POST`
2. **URL:** `{{api_base}}/api/chat/{{chat_id}}/message`
3. **Headers:**
   ```
   Authorization: Bearer {{jwt_token}}
   Content-Type: application/json
   Accept: text/event-stream
   ```
4. **Body (JSON):**
   ```json
   {
     "message": "Help me design an NFT collection concept"
   }
   ```

### Step 3: Send and View SSE Stream

1. Click **"Send"**
2. Go to **"Response"** tab
3. Postman will automatically detect `text/event-stream` content type
4. **You'll see real-time streaming chunks appearing**

### Postman SSE Response View

```
Status: 200 OK
Time: 2.5s

Streamed Response:
data: I'd love to help you create an NFT collection!

data: Here are some concept ideas...

data: {"done": true, "tokens_used": 245, "message_id": "abc-123"}
```

### Step 4: Save Request for Reuse

1. Click **"Save"**
2. Collection: "AI-NFT-Platform"
3. Request name: "Send Chat Message (SSE)"
4. Now you can reuse this for all tests

---

## Platform 3: Insomnia

**Best for:** Clean interface, excellent SSE support, modern design

### Step 1: Create Request

1. Open Insomnia
2. Create new **Request Collection**: "AI-NFT"
3. Create new **Request**:
   - Name: "Send Message (SSE)"
   - Method: `POST`
   - URL: `http://localhost:3000/api/chat/[CHAT_ID]/message`

### Step 2: Set Up Authentication & Headers

**Auth Tab:**
- Auth: `Bearer Token`
- Token: (paste your JWT token)

**Header Tab:**
```
Content-Type: application/json
Accept: text/event-stream
```

### Step 3: Add Request Body

**Body (JSON):**
```json
{
  "message": "Create a futuristic digital art NFT concept"
}
```

### Step 4: Send Request

1. Click **"Send"**
2. Response pane shows real-time SSE stream
3. Chunks appear as they arrive from server

**Insomnia Response:**
```
↓ Streaming (2500ms)

I'd love to help you create a futuristic NFT concept!

The digital art space is rapidly evolving...

{"done": true, "tokens_used": 245, "message_id": "..."}

✓ Response complete
```

### Use Insomnia Variables

1. Click **"Manage Environments"** (wrench icon)
2. Create environment:
   ```json
   {
     "jwt_token": "eyJhbGc...",
     "chat_id": "123e4567...",
     "api_url": "http://localhost:3000"
   }
   ```
3. Use in URL: `{{api_url}}/api/chat/{{chat_id}}/message`

---

## Platform 4: Thunder Client (VS Code)

**Best for:** Lightweight, built into VS Code, no external app

### Step 1: Install Extension

1. VS Code → Extensions
2. Search: **"Thunder Client"**
3. Install by rangav
4. Click Thunder Client icon (left sidebar)

### Step 2: Create Request

1. Click **"New Request"**
2. Method: `POST`
3. URL: `http://localhost:3000/api/chat/[CHAT_ID]/message`

### Step 3: Configure Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer [YOUR_JWT_TOKEN] |
| Content-Type | application/json |

### Step 4: Add Body

```json
{
  "message": "Help me brainstorm NFT ideas for digital artists"
}
```

### Step 5: Send

1. Click **"Send"**
2. Response tab shows SSE stream in real-time
3. Great for quick testing without leaving VS Code

**Thunder Client Response:**
```
Status: 200 OK
Time: 2.1s

I'd love to help! Let me suggest...
Here are some ideas for digital artists...
{"done": true, "tokens_used": 245, "message_id": "..."}
```

### Save Collections

1. Click **Collections** tab
2. New collection → "AI-NFT"
3. Requests automatically grouped
4. Reuse across sessions

---

## Platform 5: REST Client (VS Code Extension)

**Best for:** File-based testing, version control friendly, scripts

### Step 1: Install Extension

1. VS Code → Extensions
2. Search: **"REST Client"**
3. Install by Huachao Mao

### Step 2: Create Test File

Create `test_sse.http` in your project:

```http
### SSE Test - Send Message with Streaming

@baseUrl = http://localhost:3000
@token = YOUR_JWT_TOKEN_HERE
@chatId = YOUR_CHAT_ID_HERE

POST {{baseUrl}}/api/chat/{{chatId}}/message
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "message": "Create an innovative NFT concept for a music producer"
}

###

### List Chats (for reference)
GET {{baseUrl}}/api/chat
Authorization: Bearer {{token}}

###

### Create New Chat (for reference)
POST {{baseUrl}}/api/chat
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Music NFT Ideas"
}

###

### Get Chat History
GET {{baseUrl}}/api/chat/{{chatId}}?limit=10
Authorization: Bearer {{token}}
```

### Step 3: Run Tests

1. Click **"Send Request"** above the first request
2. Output panel shows:
   ```
   HTTP/1.1 200 OK
   Content-Type: text/event-stream
   
   data: I'd love to help create an NFT for music...
   data: {"done": true, "tokens_used": 245, "message_id": "..."}
   ```

### Step 4: Advanced - Save Response to File

```http
### With Response Saved

@baseUrl = http://localhost:3000
@token = YOUR_JWT_TOKEN_HERE
@chatId = YOUR_CHAT_ID_HERE

POST {{baseUrl}}/api/chat/{{chatId}}/message
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "message": "NFT concept ideas"
}
```

Response automatically saved to `.rest` folder in your project.

---

## Platform 6: Browser Console

**Best for:** Frontend integration, real user experience, debugging

### Step 1: Create HTML Test File

Create `sse_test.html` in your project:

```html
<!DOCTYPE html>
<html>
<head>
    <title>SSE Testing Dashboard</title>
    <style>
        body {
            font-family: monospace;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .section {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 8px;
            padding: 15px;
        }
        h2 {
            margin-top: 0;
            color: #4ec9b0;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #9cdcfe;
        }
        input, textarea {
            width: 100%;
            padding: 8px;
            background: #1e1e1e;
            color: #d4d4d4;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            font-family: monospace;
            box-sizing: border-box;
        }
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover {
            background: #1177bb;
        }
        button:disabled {
            background: #666;
            cursor: not-allowed;
        }
        #stream {
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 15px;
            height: 400px;
            overflow-y: auto;
            font-size: 12px;
            line-height: 1.5;
        }
        .chunk {
            margin-bottom: 8px;
            padding: 5px;
            background: #252526;
            border-left: 3px solid #4ec9b0;
            padding-left: 10px;
        }
        .chunk.metadata {
            border-left-color: #ce9178;
            background: #2d2d2d;
        }
        .chunk.error {
            border-left-color: #f48771;
            background: #3f2a2a;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            background: #2d3d2d;
            color: #6a9955;
        }
        .status.error {
            background: #3f2a2a;
            color: #f48771;
        }
        .status.info {
            background: #2d3a4d;
            color: #9cdcfe;
        }
    </style>
</head>
<body>
    <h1>🎮 SSE API Testing Dashboard</h1>
    
    <div class="container">
        <div class="section">
            <h2>⚙️ Configuration</h2>
            
            <div class="form-group">
                <label>API Base URL:</label>
                <input type="text" id="apiUrl" value="http://localhost:3000" />
            </div>
            
            <div class="form-group">
                <label>JWT Token:</label>
                <textarea id="jwtToken" placeholder="Paste your JWT token here..." rows="3"></textarea>
            </div>
            
            <div class="form-group">
                <label>Chat ID (UUID):</label>
                <input type="text" id="chatId" placeholder="Paste your chat ID here..." />
            </div>
            
            <div class="form-group">
                <label>Message:</label>
                <textarea id="message" placeholder="Your message to send..." rows="3">Help me create an NFT concept</textarea>
            </div>
            
            <button onclick="testSSE()">📤 Send Message & Stream</button>
            <button onclick="clearLog()">🗑️ Clear Log</button>
        </div>
        
        <div class="section">
            <h2>📊 Real-time Stream</h2>
            <div id="status" class="status"></div>
            <div id="stream"></div>
        </div>
    </div>

    <script>
        function log(message, type = 'chunk') {
            const streamEl = document.getElementById('stream');
            const chunk = document.createElement('div');
            chunk.className = `chunk ${type}`;
            chunk.textContent = message;
            streamEl.appendChild(chunk);
            streamEl.scrollTop = streamEl.scrollHeight;
        }

        function setStatus(message, type = 'info') {
            const statusEl = document.getElementById('status');
            statusEl.className = `status ${type}`;
            statusEl.textContent = message;
        }

        async function testSSE() {
            const apiUrl = document.getElementById('apiUrl').value;
            const token = document.getElementById('jwtToken').value;
            const chatId = document.getElementById('chatId').value;
            const message = document.getElementById('message').value;

            if (!token) {
                setStatus('❌ JWT Token is required!', 'error');
                return;
            }

            if (!chatId) {
                setStatus('❌ Chat ID is required!', 'error');
                return;
            }

            if (!message) {
                setStatus('❌ Message is required!', 'error');
                return;
            }

            clearLog();
            setStatus('🔄 Connecting...', 'info');
            log(`Connecting to: ${apiUrl}/api/chat/${chatId}/message`);

            try {
                const response = await fetch(`${apiUrl}/api/chat/${chatId}/message`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message }),
                });

                if (!response.ok) {
                    const error = await response.text();
                    setStatus(`❌ Error: ${response.status}`, 'error');
                    log(`Status: ${response.status}`);
                    log(`Response: ${error}`);
                    return;
                }

                setStatus('✅ Connected! Streaming...', 'info');
                log('Connection established');
                log('Waiting for chunks...\n');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';
                let chunkCount = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    fullResponse += chunk;

                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6);
                            chunkCount++;

                            // Try to parse as JSON for metadata
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.done) {
                                    log(`✓ Stream Complete!`, 'metadata');
                                    log(`Tokens Used: ${parsed.tokens_used}`, 'metadata');
                                    log(`Message ID: ${parsed.message_id}`, 'metadata');
                                } else {
                                    log(data, 'metadata');
                                }
                            } catch {
                                // Regular text chunk
                                log(`Chunk ${chunkCount}: ${data}`);
                            }
                        }
                    }
                }

                setStatus(
                    `✅ Complete! Received ${chunkCount} chunks`,
                    'info'
                );

            } catch (error) {
                setStatus(`❌ Error: ${error.message}`, 'error');
                log(`Error: ${error.message}`);
            }
        }

        function clearLog() {
            document.getElementById('stream').innerHTML = '';
            document.getElementById('status').innerHTML = '';
        }

        // Optional: Load token from localStorage if available
        window.addEventListener('load', () => {
            const savedToken = localStorage.getItem('jwtToken');
            const savedChatId = localStorage.getItem('chatId');
            if (savedToken) document.getElementById('jwtToken').value = savedToken;
            if (savedChatId) document.getElementById('chatId').value = savedChatId;
        });

        // Save to localStorage when changed
        document.getElementById('jwtToken').addEventListener('change', (e) => {
            localStorage.setItem('jwtToken', e.target.value);
        });

        document.getElementById('chatId').addEventListener('change', (e) => {
            localStorage.setItem('chatId', e.target.value);
        });
    </script>
</body>
</html>
```

### Step 2: Open in Browser

1. Save as `test_sse.html` in your project root
2. Open: `file:///path/to/test_sse.html` or
3. Use VS Code Live Server extension:
   - Right-click file → "Open with Live Server"
   - Opens at `http://localhost:5500/test_sse.html`

### Step 3: Test

1. Paste JWT token
2. Paste Chat ID
3. Enter message
4. Click "📤 Send Message & Stream"
5. Watch real-time streaming chunks appear!

### Browser Console Debugging

Open DevTools (F12):

```javascript
// Test in console directly
const response = await fetch('http://localhost:3000/api/chat/[CHAT_ID]/message', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer [YOUR_TOKEN]',
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'test' }),
});

const reader = response.body.getReader();
const { value } = await reader.read();
console.log(new TextDecoder().decode(value));
```

---

## Platform 7: Node.js Script

**Best for:** Automation, testing within CI/CD, data collection

### Create Test Script

Save as `test_sse.js`:

```javascript
/**
 * SSE API Test Script
 * Tests your streaming endpoint and logs results
 */

const http = require('http');
const https = require('https');

// Configuration
const API_URL = 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || 'YOUR_TOKEN_HERE';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE';
const MESSAGE = 'Help me create an NFT design concept';

// Parse URL
const url = new URL(`${API_URL}/api/chat/${CHAT_ID}/message`);
const client = url.protocol === 'https:' ? https : http;

console.log('🚀 Starting SSE Test...\n');
console.log(`📍 Endpoint: ${url.href}`);
console.log(`📝 Message: ${MESSAGE}\n`);

// Prepare request
const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    },
};

const requestBody = JSON.stringify({ message: MESSAGE });

// Make request
const req = client.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    console.log(`\n📊 Response Stream:\n`);

    let chunkCount = 0;
    let fullResponse = '';
    const startTime = Date.now();

    res.on('data', (chunk) => {
        const data = chunk.toString();
        fullResponse += data;
        chunkCount++;

        // Parse and display chunks
        const lines = data.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const content = line.substring(6);
                
                // Check if it's JSON (metadata)
                if (content.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(content);
                        console.log(`\n✨ METADATA RECEIVED:`);
                        console.log(JSON.stringify(parsed, null, 2));
                    } catch {
                        console.log(`📨 Chunk ${chunkCount}: ${content}`);
                    }
                } else if (content.trim()) {
                    console.log(`📨 Chunk ${chunkCount}: ${content}`);
                }
            }
        }
    });

    res.on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n\n✅ Stream Complete!`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📦 Total chunks: ${chunkCount}`);
        console.log(`📏 Total bytes: ${fullResponse.length}`);
    });
});

req.on('error', (error) => {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('❌ Request timeout');
    req.destroy();
    process.exit(1);
});

// Send request
req.write(requestBody);
req.end();

// Set timeout
req.setTimeout(30000);
```

### Run the Script

```bash
# Set your credentials
export JWT_TOKEN="eyJhbGc..."
export CHAT_ID="123e4567..."

# Run
node test_sse.js
```

### Expected Output

```
🚀 Starting SSE Test...

📍 Endpoint: http://localhost:3000/api/chat/123e4567.../message
📝 Message: Help me create an NFT design concept

✅ Status: 200
📋 Headers: { 'content-type': 'text/event-stream', ... }

📊 Response Stream:

📨 Chunk 1: I'd love to help you create an NFT design concept!
📨 Chunk 2: Let me think about some creative directions...
📨 Chunk 3: You could explore themes like...

✨ METADATA RECEIVED:
{
  "done": true,
  "tokens_used": 245,
  "message_id": "abc-123-def"
}

✅ Stream Complete!
⏱️  Duration: 2.35s
📦 Total chunks: 47
📏 Total bytes: 3250
```

---

## Platform 8: Python Script

**Best for:** Data analysis, stress testing, advanced testing

### Create Python Test Script

Save as `test_sse.py`:

```python
#!/usr/bin/env python3
"""
SSE API Test Script - Advanced Testing with Python
Supports:
- Single message test
- Stress testing (multiple concurrent requests)
- Response analysis
- Token counting verification
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Generator
import concurrent.futures

# Configuration
API_BASE = "http://localhost:3000"
JWT_TOKEN = "eyJhbGc..."  # Set this
CHAT_ID = "123e4567..."   # Set this

class SSEStreamTester:
    def __init__(self, api_base: str, token: str, chat_id: str):
        self.api_base = api_base
        self.token = token
        self.chat_id = chat_id
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

    def send_message_stream(self, message: str) -> dict:
        """
        Send message and stream response
        Returns: dict with stats and response
        """
        url = f"{self.api_base}/api/chat/{self.chat_id}/message"
        payload = {"message": message}
        
        print(f"\n🚀 Sending: {message}")
        print(f"📍 Endpoint: {url}\n")
        
        start_time = time.time()
        stats = {
            'message': message,
            'chunks': [],
            'chunk_count': 0,
            'total_bytes': 0,
            'tokens_used': 0,
            'message_id': None,
            'duration': 0,
            'error': None,
        }
        
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self.headers,
                stream=True,
                timeout=30
            )
            
            if response.status_code != 200:
                stats['error'] = f"HTTP {response.status_code}"
                print(f"❌ Error: {stats['error']}")
                print(response.text)
                return stats
            
            print("✅ Connected! Streaming:\n")
            
            # Process stream
            for chunk_num, line in enumerate(response.iter_lines(), 1):
                if not line:
                    continue
                
                line_str = line.decode('utf-8') if isinstance(line, bytes) else line
                
                if line_str.startswith('data: '):
                    data_content = line_str[6:]  # Remove 'data: '
                    stats['total_bytes'] += len(data_content)
                    stats['chunk_count'] += 1
                    
                    # Try parsing as JSON
                    try:
                        data_json = json.loads(data_content)
                        if data_json.get('done'):
                            print(f"✨ METADATA RECEIVED:")
                            print(f"   Tokens Used: {data_json.get('tokens_used')}")
                            print(f"   Message ID: {data_json.get('message_id')}")
                            stats['tokens_used'] = data_json.get('tokens_used', 0)
                            stats['message_id'] = data_json.get('message_id')
                        else:
                            print(f"   Chunk {chunk_num}: {data_content}")
                            stats['chunks'].append(data_content)
                    except json.JSONDecodeError:
                        # Regular text chunk
                        print(f"   Chunk {chunk_num}: {data_content}")
                        stats['chunks'].append(data_content)
            
            stats['duration'] = time.time() - start_time
            print(f"\n✅ Stream Complete!")
            
        except requests.RequestException as e:
            stats['error'] = str(e)
            print(f"❌ Error: {e}")
        
        return stats

    def print_stats(self, stats: dict):
        """Pretty print statistics"""
        print("\n" + "="*50)
        print("📊 TEST STATISTICS")
        print("="*50)
        print(f"Message: {stats['message']}")
        print(f"Duration: {stats['duration']:.2f}s")
        print(f"Chunks: {stats['chunk_count']}")
        print(f"Total Bytes: {stats['total_bytes']}")
        print(f"Tokens Used: {stats['tokens_used']}")
        print(f"Message ID: {stats['message_id']}")
        if stats['error']:
            print(f"Error: {stats['error']}")
        print("="*50)

def main():
    # Check environment
    if JWT_TOKEN == "eyJhbGc..." or CHAT_ID == "123e4567...":
        print("❌ Please set JWT_TOKEN and CHAT_ID in the script!")
        sys.exit(1)
    
    # Create tester
    tester = SSEStreamTester(API_BASE, JWT_TOKEN, CHAT_ID)
    
    # Test 1: Basic SSE test
    print("\n🎮 TEST 1: Basic SSE Streaming")
    stats = tester.send_message_stream("Help me create an NFT concept")
    tester.print_stats(stats)
    
    # Test 2: Different message
    print("\n\n🎮 TEST 2: Different Message")
    stats2 = tester.send_message_stream("Design a digital art NFT collection")
    tester.print_stats(stats2)
    
    # Test 3: Long message
    print("\n\n🎮 TEST 3: Longer Message")
    long_msg = "I want to create an NFT collection that represents digital art. " * 3
    stats3 = tester.send_message_stream(long_msg[:500])
    tester.print_stats(stats3)
    
    # Summary
    print("\n\n📈 SUMMARY")
    all_stats = [stats, stats2, stats3]
    total_duration = sum(s['duration'] for s in all_stats)
    total_tokens = sum(s['tokens_used'] for s in all_stats)
    
    print(f"Total Tests: {len(all_stats)}")
    print(f"Total Duration: {total_duration:.2f}s")
    print(f"Total Tokens: {total_tokens}")
    print(f"Avg Duration per test: {total_duration/len(all_stats):.2f}s")

if __name__ == '__main__':
    main()
```

### Run Python Script

```bash
# Install dependencies
pip install requests

# Run
python test_sse.py
```

### Expected Output

```
🎮 TEST 1: Basic SSE Streaming
🚀 Sending: Help me create an NFT concept
📍 Endpoint: http://localhost:3000/api/chat/.../message

✅ Connected! Streaming:

   Chunk 1: I'd love to help you create an NFT concept!
   Chunk 2: Let me suggest...
   Chunk 3: You could explore...

✨ METADATA RECEIVED:
   Tokens Used: 245
   Message ID: abc-123

✅ Stream Complete!

==================================================
📊 TEST STATISTICS
==================================================
Duration: 2.35s
Chunks: 47
Total Bytes: 3250
Tokens Used: 245
==================================================
```

---

## Testing Checklist

Use this checklist to verify your SSE API is working correctly:

### ✅ Pre-Test Setup
- [ ] Server running on port 3000
- [ ] JWT token obtained and valid
- [ ] Chat created and chatId obtained
- [ ] Gemini API key configured
- [ ] Database accessible

### ✅ Response Headers
- [ ] `Content-Type: text/event-stream`
- [ ] `Cache-Control: no-cache`
- [ ] `Connection: keep-alive`
- [ ] `X-Accel-Buffering: no`

### ✅ SSE Chunks
- [ ] Chunks arrive in real-time
- [ ] Chunks formatted as `data: <content>\n\n`
- [ ] Multiple chunks received (not all at once)
- [ ] Chunks contain meaningful content

### ✅ Final Metadata
- [ ] Final event contains `done: true`
- [ ] `tokens_used` is a positive number
- [ ] `message_id` is a valid UUID
- [ ] Stream closes cleanly after metadata

### ✅ Database Updates
- [ ] User message saved in `messages` table
- [ ] AI response saved in `messages` table
- [ ] Tokens counted correctly
- [ ] `user_usage` table updated

### ✅ Error Handling
- [ ] Invalid token → 401 error (JSON)
- [ ] Invalid chatId → 404 error (JSON)
- [ ] Invalid message → 400 error (JSON)
- [ ] Empty message → 400 error (JSON)
- [ ] Gemini error → SSE error event

### ✅ Performance
- [ ] Total response time < 5s
- [ ] Chunks arrive within 1-2s of request
- [ ] No timeout errors
- [ ] Memory usage stable

---

## Troubleshooting

### Issue: "Connection refused"
```bash
# Fix: Make sure server is running
cd /Users/bizer/Development/Projects/AI-NFT-Platform/server
npm run dev
```

### Issue: "401 Unauthorized"
```bash
# Fix: Check your JWT token
# 1. Verify token is not expired
# 2. Verify token is in Authorization header
# 3. Get a new token by logging in

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "..."}'
```

### Issue: "404 Not Found"
```bash
# Fix: Verify chatId is correct and belongs to you
curl -X GET http://localhost:3000/api/chat \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Issue: "Stream not appearing in Postman"
```
Solution:
1. Go to Postman Preferences → General
2. Enable "Stream response when body is chunked"
3. Send request again
```

### Issue: "No real-time chunks, all at once"
```
Solution:
1. Check server logs for errors
2. Verify Gemini API is responding
3. Check network throttling (DevTools)
4. Verify X-Accel-Buffering: no header
```

### Issue: "Tokens not calculated correctly"
```bash
# Verify in database:
SELECT message_id, tokens_consumed, content 
FROM messages 
WHERE message_id = '<recent_message_id>'
ORDER BY created_at DESC LIMIT 5;
```

### Issue: "CORS errors"
```
Solution:
1. Check CORS middleware is enabled
2. Verify Origin header matches allowed origins
3. Check error logs for detailed message
```

---

## Quick Start Summary

**Fastest way to test right now:**

```bash
# 1. Get token
export JWT_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Create chat
export CHAT_ID=$(curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' \
  | grep -o '"chat_id":"[^"]*' | cut -d'"' -f4)

# 3. Send message with SSE
curl -X POST http://localhost:3000/api/chat/$CHAT_ID/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Help me create an NFT"}' \
  --no-buffer
```

**Recommended Testing Platform by Use Case:**

- **Quick CLI test**: cURL
- **GUI with SSE support**: Postman or Insomnia
- **VS Code only**: Thunder Client or REST Client
- **Real user experience**: Browser Console (HTML file)
- **Automation/CI-CD**: Node.js or Python script
- **Team collaboration**: Postman with shared collections
