# Conclave

Yet another planning poker tool.


## Features

- No subscription needed
- Real-time using websockets
- Vote on specific items, or without selected items
- Administrator have a special access to vote outside the main screen
- Card deck can be customized
- Mobile and desktop friendly
- Based on Cloudflare Durable Objects on server side


## How to access

For now, it is hosted on https://conclave.alea.net

It may be retired in case of abuse, or if the Cloudflare free plan is not
good enough for my needs.

It is provided **as-is**, without warranty or support of any kind. The author(s)
make no guarantee regarding data integrity, compatibility across versions, or
fitness for any particular purpose.

**You are responsible for maintaining your own backups.**  The author(s) shall
not be liable for any data loss, corruption, or damages arising from the use of
this software.

Data is locally stored in your web browser local storage. Some web analytics are
present using Cloudflare Analytics, but no cookies are used and no per-user data
is collected.


## How to build

### Prerequisites & Technologies

This app uses React, TypeScript, Vite, WebSockets, and Cloudflare Durable
Objects on server side. A low-cost (free?) rendez-vous server is needed, an
Cloudflare provides that under 100 000 requests without having to provide a
credit card.

To start working, you need:

- **Node.js** (v18 or later)
- **npm** (v9 or later)
- **Cloudflare Account** (required for production deployment with Durable Objects)

All tests were performed under a MacOS environment.

### 1. Install Dependencies

From the repo root, install all workspace dependencies in one shot:

```bash
npm install
```

### 2. Local Development

`vite` is configured with a the Cloudflare `wrangler` plugin which prepare the
client and a local server.

```bash
npm run dev
```

### 3. Building for Production

```bash
npm run build
```

The output with the client and the Cloudflare worker will be in `client/dist`.


## How to deploy

- create a Cloudflare account
- in Workers & Pages, create a new application
- configure a new GitHub link, and reference the project or its clone

Build configuration:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --cwd client`
- Root directory: `/`


## Architecture

```
conclave/
├── client/            # React SPA (Vite + TypeScript)
├── server-cloudflare/ # Cloudflare Worker + Durable Objects
└── shared/            # Shared TypeScript types & utilities (workspace package)
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
