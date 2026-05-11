# Conclave Architecture

## Software Components

The project is organized so that it could evolve to use a different backend.

Cloudflare tooling is strong (usage of DurableObject, Wrangler and Vite Wrangler
plugin), but it must be possible to make the software evolves to use a different
backend and different toolings.

### The client

The client must not be tied to its backend. Standard protocols must be used
(HTTP API calls, WebSockets) without going through some library provided by some
proprietary backends.

### The backend


### Shared libraries

Protocols elements that needs to be on both client and backend sides are organized 