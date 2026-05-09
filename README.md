# Conclave

Poker planning. Built with **React**, **TypeScript**, and **Cloudflare Durable Objects** for seamless, low-latency synchronization.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or later)
- **npm** (v9 or later)
- **Cloudflare Account** (Required for Durable Objects deployment)

### 1. Bootstrap the Project
Install all dependencies for all workspaces in one command:

```bash
npm install
```

### 2. Local Development
Run the client and server in separate terminals using workspace commands:

**Start the Backend:**
```bash
npm run dev:server
```

**Start the Frontend:**
```bash
npm run dev:client
```

### 3. Building for Production

#### Frontend
Build the optimized production bundle:
```bash
cd client
npm run build
```
The output will be in `client/dist`.

#### Backend
Deploy your worker and Durable Objects to Cloudflare:
```bash
cd server
npx wrangler deploy
```

## 🏗️ Architecture

- **Frontend**: Single Page Application (SPA) using React 18 and Vite. Styled with a clean lite-mode aesthetic.
- **Backend**: Cloudflare Workers with Durable Objects. Durable Objects act as the single source of truth for each room, handling real-time WebSocket communication.
- **Real-time Sync**: Uses WebSockets for zero-latency voting and state updates.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
