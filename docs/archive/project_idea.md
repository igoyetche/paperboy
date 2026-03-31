# Send to Kindle integration

Find a way to make Claude send documents to my kindle automatically

# Kindle MCP Server — Specification

## Overview

A Model Context Protocol (MCP) server that exposes a tool for sending content directly to a Kindle device via Amazon's "Send to Kindle" email service. Claude (or any MCP-compatible client) can invoke the tool with content and metadata, and the server handles formatting, file creation, and email delivery transparently.

---

## Goals

- Allow Claude to send generated content to a Kindle with a single tool call
- Support common content formats (Markdown, plain text, HTML)
- Produce well-formatted Kindle documents with proper titles and structure
- Be simple to self-host locally (stdio transport) or as a small cloud service (HTTP/SSE)

---

## Non-Goals

- No user authentication or multi-user support (single-user, personal tool)
- No two-way communication with Kindle (no reading highlights, no library access)
- No DRM or commercial publishing pipeline
- No support for binary files (images, PDFs) in v1

---

## Architecture

```
Claude
  │
  │  MCP tool call: send_to_kindle(...)
  ▼
MCP Server (Node.js or Python)
  ├── Input validation
  ├── Content conversion  →  .html / .txt / .epub file
  └── Email delivery      →  SMTP → youraddress@kindle.com
                                        │
                                        ▼
                                   Amazon Whispernet
                                        │
                                        ▼
                                   Kindle Device
```

---

## MCP Tool Definition

### Tool: `send_to_kindle`

Sends a document to the configured Kindle device.

### Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | Yes | — | Document title, shown in the Kindle library |
| `content` | string | Yes | — | The document body. Accepts Markdown, plain text, or HTML |
| `format` | enum | No | `html` | Output format: `html`, `txt`, or `epub` |
| `author` | string | No | `Claude` | Author metadata embedded in the document |

### Return value

```json
{
  "success": true,
  "message": "Document 'My Title' sent to Kindle successfully.",
  "format": "html",
  "size_bytes": 4821
}
```

On failure:

```json
{
  "success": false,
  "error": "SMTP authentication failed",
  "details": "..."
}
```

### Example tool call (as Claude would invoke it)

```json
{
  "tool": "send_to_kindle",
  "parameters": {
    "title": "Summary of Clean Architecture",
    "content": "# Clean Architecture\n\nRobert C. Martin argues that...",
    "format": "html",
    "author": "Claude"
  }
}
```

---

## Configuration

All configuration lives in a `.env` file (or environment variables). No config is passed at call time, keeping the tool interface minimal.

```
# Kindle delivery address (from Amazon account settings)
KINDLE_EMAIL=yourname@kindle.com

# Sender email — must be in Amazon's approved senders list
SENDER_EMAIL=you@gmail.com

# SMTP provider credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password

# Optional: default author name
DEFAULT_AUTHOR=Claude
```

### Amazon-side setup required

1. Log in to Amazon → Manage Your Content and Devices → Preferences → Personal Document Settings
2. Note your Kindle's `@kindle.com` email address
3. Add your `SENDER_EMAIL` to the **Approved Personal Document E-mail List**

---

## Content Processing Pipeline

### Input → Output format mapping

| Input | `format=html` | `format=txt` | `format=epub` |
| --- | --- | --- | --- |
| Markdown | Convert MD → HTML | Strip to text | Convert MD → EPUB |
| HTML | Use as-is (sanitized) | Strip tags | Wrap in EPUB structure |
| Plain text | Wrap in minimal HTML | Use as-is | Wrap in EPUB structure |

### HTML output requirements

The generated `.html` file must:

- Include a `<title>` tag matching the `title` parameter
- Use UTF-8 encoding
- Apply minimal inline CSS for readable typography on e-ink (font size, line height, margins)
- Be a single self-contained file (no external assets in v1)

### EPUB output (v1 scope: optional / stretch goal)

If `format=epub`, the server produces a valid EPUB 3.0 package with:

- `content.opf` manifest
- Single content chapter from the provided content
- Title and author metadata

Libraries: `epub-gen` (Node) or `ebooklib` (Python).

---

## Email Delivery

- Attach the generated file to an email
- Subject line: the document `title`
- Body: minimal (Amazon ignores it; the attachment is what matters)
- File naming: `{sanitized-title}.{ext}` (e.g., `clean-architecture.html`)

### Supported attachment formats by Amazon

| Format | Notes |
| --- | --- |
| `.html` | Best for Markdown-originated content |
| `.txt` | Simplest, no formatting |
| `.epub` | Richest formatting, best reading experience |
| `.doc` | Supported by Amazon but not recommended for generated content |
| `.pdf` | Supported but poor reflow on Kindle — avoid in this use case |

---

## Transport Options

### Option A: stdio (recommended for local use)

The server communicates over stdin/stdout. No network port needed. Ideal for Claude Desktop or Claude Code.

**Claude Desktop config (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "kindle": {
      "command": "node",
      "args": ["/path/to/kindle-mcp/index.js"],
      "env": {
        "KINDLE_EMAIL": "yourname@kindle.com",
        "SENDER_EMAIL": "you@gmail.com",
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "you@gmail.com",
        "SMTP_PASS": "your-app-password"
      }
    }
  }
}
```

### Option B: HTTP/SSE (for remote access or claude.ai)

Expose the server over HTTP with Server-Sent Events transport. Requires a public URL (e.g., a small VPS, Railway, Fly.io, or a local tunnel via ngrok/Cloudflare Tunnel).

---

## Tech Stack Recommendation

### Node.js (recommended)

| Concern | Library |
| --- | --- |
| MCP SDK | `@anthropic-ai/sdk` / `@modelcontextprotocol/sdk` |
| Markdown → HTML | `marked` |
| HTML sanitization | `sanitize-html` |
| Email delivery | `nodemailer` |
| EPUB generation | `epub-gen` (stretch goal) |
| Config | `dotenv` |

### Python (alternative)

| Concern | Library |
| --- | --- |
| MCP SDK | `mcp` (Anthropic) |
| Markdown → HTML | `markdown` |
| Email delivery | `smtplib` (stdlib) |
| EPUB generation | `ebooklib` |
| Config | `python-dotenv` |

---

## Project Structure (Node.js)

```
kindle-mcp/
├── index.js           # MCP server entry point, tool registration
├── converter.js       # Content conversion logic (MD/HTML/txt → output format)
├── mailer.js          # Email delivery via nodemailer
├── .env               # Local config (gitignored)
├── .env.example       # Template for config
├── package.json
└── README.md
```

---

## Error Handling

| Scenario | Behavior |
| --- | --- |
| Missing required parameter | Return error response with clear message |
| SMTP auth failure | Return error, log details server-side |
| Sender not in approved list | Amazon bounces — surface bounce info if detectable |
| Content too large (>50MB) | Reject with size error before sending |
| Invalid format value | Return validation error |

---

## Security Considerations

- SMTP credentials live only in environment variables, never in tool parameters
- Kindle email address is server-side config — Claude never sees or handles it
- Sanitize HTML input to prevent injection into the generated document
- No external network calls other than SMTP delivery

---

## Future Enhancements (out of v1 scope)

- `list_formats` tool: returns supported formats
- `preview_document` tool: returns a base64 preview of the generated file before sending
- Support for images embedded in content (base64 inline)
- Multiple Kindle profiles (e.g., personal vs. work device)
- Delivery confirmation via email reply parsing
- Claude.ai remote MCP endpoint (HTTP/SSE transport with auth)

---

## Acceptance Criteria for v1

- [ ]  `send_to_kindle` tool registered and callable via MCP
- [ ]  Markdown content is correctly converted to HTML before sending
- [ ]  Email is delivered with the file attached to the configured Kindle address
- [ ]  Title appears correctly in the Kindle library
- [ ]  Success and error responses are structured as defined above
- [ ]  Works via stdio transport with Claude Desktop
- [ ]  README documents setup steps (Amazon approved sender, SMTP config)

# Kindle MCP Server — Specification

## Overview

A Model Context Protocol (MCP) server that exposes a tool for sending content directly to a Kindle device via Amazon's "Send to Kindle" email service. Claude (or any MCP-compatible client) can invoke the tool with content and metadata, and the server handles formatting, file creation, and email delivery transparently.

---

## Goals

- Allow Claude to send generated content to a Kindle with a single tool call
- Support common content formats (Markdown, plain text, HTML)
- Produce well-formatted Kindle documents with proper titles and structure
- Be simple to self-host locally (stdio transport) or as a small cloud service (HTTP/SSE)

---

## Non-Goals

- No user authentication or multi-user support (single-user, personal tool)
- No two-way communication with Kindle (no reading highlights, no library access)
- No DRM or commercial publishing pipeline
- No support for binary files (images, PDFs) in v1

---

## Architecture

```
Claude
  │
  │  MCP tool call: send_to_kindle(...)
  ▼
MCP Server (Node.js or Python)
  ├── Input validation
  ├── Content conversion  →  .html / .txt / .epub file
  └── Email delivery      →  SMTP → youraddress@kindle.com
                                        │
                                        ▼
                                   Amazon Whispernet
                                        │
                                        ▼
                                   Kindle Device
```

---

## MCP Tool Definition

### Tool: `send_to_kindle`

Sends a document to the configured Kindle device.

### Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | Yes | — | Document title, shown in the Kindle library |
| `content` | string | Yes | — | The document body. Accepts Markdown, plain text, or HTML |
| `format` | enum | No | `html` | Output format: `html`, `txt`, or `epub` |
| `author` | string | No | `Claude` | Author metadata embedded in the document |

### Return value

```json
{
  "success": true,
  "message": "Document 'My Title' sent to Kindle successfully.",
  "format": "html",
  "size_bytes": 4821
}
```

On failure:

```json
{
  "success": false,
  "error": "SMTP authentication failed",
  "details": "..."
}
```

### Example tool call (as Claude would invoke it)

```json
{
  "tool": "send_to_kindle",
  "parameters": {
    "title": "Summary of Clean Architecture",
    "content": "# Clean Architecture\n\nRobert C. Martin argues that...",
    "format": "html",
    "author": "Claude"
  }
}
```

---

## Configuration

All configuration lives in a `.env` file (or environment variables). No config is passed at call time, keeping the tool interface minimal.

```
# Kindle delivery address (from Amazon account settings)
KINDLE_EMAIL=yourname@kindle.com

# Sender email — must be in Amazon's approved senders list
SENDER_EMAIL=you@gmail.com

# SMTP provider credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password

# Optional: default author name
DEFAULT_AUTHOR=Claude
```

### Amazon-side setup required

1. Log in to Amazon → Manage Your Content and Devices → Preferences → Personal Document Settings
2. Note your Kindle's `@kindle.com` email address
3. Add your `SENDER_EMAIL` to the **Approved Personal Document E-mail List**

---

## Content Processing Pipeline

### Input → Output format mapping

| Input | `format=html` | `format=txt` | `format=epub` |
| --- | --- | --- | --- |
| Markdown | Convert MD → HTML | Strip to text | Convert MD → EPUB |
| HTML | Use as-is (sanitized) | Strip tags | Wrap in EPUB structure |
| Plain text | Wrap in minimal HTML | Use as-is | Wrap in EPUB structure |

### HTML output requirements

The generated `.html` file must:

- Include a `<title>` tag matching the `title` parameter
- Use UTF-8 encoding
- Apply minimal inline CSS for readable typography on e-ink (font size, line height, margins)
- Be a single self-contained file (no external assets in v1)

### EPUB output (v1 scope: optional / stretch goal)

If `format=epub`, the server produces a valid EPUB 3.0 package with:

- `content.opf` manifest
- Single content chapter from the provided content
- Title and author metadata

Libraries: `epub-gen` (Node) or `ebooklib` (Python).

---

## Email Delivery

- Attach the generated file to an email
- Subject line: the document `title`
- Body: minimal (Amazon ignores it; the attachment is what matters)
- File naming: `{sanitized-title}.{ext}` (e.g., `clean-architecture.html`)

### Supported attachment formats by Amazon

| Format | Notes |
| --- | --- |
| `.html` | Best for Markdown-originated content |
| `.txt` | Simplest, no formatting |
| `.epub` | Richest formatting, best reading experience |
| `.doc` | Supported by Amazon but not recommended for generated content |
| `.pdf` | Supported but poor reflow on Kindle — avoid in this use case |

---

## Transport Options

### Option A: stdio (recommended for local use)

The server communicates over stdin/stdout. No network port needed. Ideal for Claude Desktop or Claude Code.

**Claude Desktop config (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "kindle": {
      "command": "node",
      "args": ["/path/to/kindle-mcp/index.js"],
      "env": {
        "KINDLE_EMAIL": "yourname@kindle.com",
        "SENDER_EMAIL": "you@gmail.com",
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "you@gmail.com",
        "SMTP_PASS": "your-app-password"
      }
    }
  }
}
```

### Option B: HTTP/SSE (for remote access or claude.ai)

Expose the server over HTTP with Server-Sent Events transport. Requires a public URL (e.g., a small VPS, Railway, Fly.io, or a local tunnel via ngrok/Cloudflare Tunnel).

---

## Tech Stack Recommendation

### Node.js (recommended)

| Concern | Library |
| --- | --- |
| MCP SDK | `@anthropic-ai/sdk` / `@modelcontextprotocol/sdk` |
| Markdown → HTML | `marked` |
| HTML sanitization | `sanitize-html` |
| Email delivery | `nodemailer` |
| EPUB generation | `epub-gen` (stretch goal) |
| Config | `dotenv` |

### Python (alternative)

| Concern | Library |
| --- | --- |
| MCP SDK | `mcp` (Anthropic) |
| Markdown → HTML | `markdown` |
| Email delivery | `smtplib` (stdlib) |
| EPUB generation | `ebooklib` |
| Config | `python-dotenv` |

---

## Project Structure (Node.js)

```
kindle-mcp/
├── index.js           # MCP server entry point, tool registration
├── converter.js       # Content conversion logic (MD/HTML/txt → output format)
├── mailer.js          # Email delivery via nodemailer
├── .env               # Local config (gitignored)
├── .env.example       # Template for config
├── package.json
└── README.md
```

---

## Error Handling

| Scenario | Behavior |
| --- | --- |
| Missing required parameter | Return error response with clear message |
| SMTP auth failure | Return error, log details server-side |
| Sender not in approved list | Amazon bounces — surface bounce info if detectable |
| Content too large (>50MB) | Reject with size error before sending |
| Invalid format value | Return validation error |

---

## Security Considerations

- SMTP credentials live only in environment variables, never in tool parameters
- Kindle email address is server-side config — Claude never sees or handles it
- Sanitize HTML input to prevent injection into the generated document
- No external network calls other than SMTP delivery

---

## Future Enhancements (out of v1 scope)

- `list_formats` tool: returns supported formats
- `preview_document` tool: returns a base64 preview of the generated file before sending
- Support for images embedded in content (base64 inline)
- Multiple Kindle profiles (e.g., personal vs. work device)
- Delivery confirmation via email reply parsing
- Claude.ai remote MCP endpoint (HTTP/SSE transport with auth)

---

## Acceptance Criteria for v1

- [ ]  `send_to_kindle` tool registered and callable via MCP
- [ ]  Markdown content is correctly converted to HTML before sending
- [ ]  Email is delivered with the file attached to the configured Kindle address
- [ ]  Title appears correctly in the Kindle library
- [ ]  Success and error responses are structured as defined above
- [ ]  -Works via stdio transport with Claude Desktop
- [ ]  README documents setup steps (Amazon approved sender, SMTP config)

Great idea — the Raspberry Pi is perfect for this. Always-on, low power, already on your network. Running the email server locally also removes the dependency on Gmail app passwords or third-party SMTP relays.

Let me think through the additions this implies:

**Container setup (Docker on Raspberry Pi):**

- The MCP server runs as a Docker container — easy to manage, restart on boot, isolate dependencies
- ARM64/ARMv7 compatible base image needed (Node.js official images support this fine)
- `docker-compose` to wire up the MCP server + email server together

**Local email server options:**

| Option | Pros | Cons |
| --- | --- | --- |
| **Postfix** | Battle-tested, full MTA | Complex config, needs domain/PTR for external delivery |
| **msmtp** | Lightweight, relay-only | Still needs an upstream relay |
| **Mailpit** | Modern, Docker-native, has a web UI | Dev-focused, not production MTA |
| **Maddy** | Modern all-in-one, Docker-friendly | Less mature |

Here's the nuance worth considering: Amazon's `@kindle.com` is an **external** email address. To deliver to it directly, your Raspberry Pi would need to send email to Amazon's mail servers — which means your IP needs a clean reputation and ideally a PTR (reverse DNS) record. Most home ISPs block port 25 outbound or have IPs on blocklists, which would cause Amazon to silently reject the delivery.

**Two realistic architectures:**

**Option A — Pi as MCP server + relay through a free external SMTP**

```
Claude → MCP Server (Pi container)
           └── sends via free SMTP relay (Brevo/Resend free tier)
                    └── delivers to @kindle.com
```

Simplest. Keeps the Pi self-contained but uses a free-tier relay for the last mile. Brevo (formerly Sendinblue) gives 300 emails/day free — more than enough.

**Option B — Pi as full stack, tunnel outbound port 25**

```
Claude → MCP Server (Pi container)
           └── Postfix container (local MTA)
                    └── delivers directly to Amazon's MX
```

More self-sufficient but fragile due to ISP restrictions. Probably not worth it for this use case.

**Recommended stack update for the spec:**

```
docker-compose.yml
├── kindle-mcp        # Node.js MCP server (ARM-compatible image)
└── smtp-relay        # Lightweight SMTP (e.g., namshi/smtp or mwader/postfix-relay)
                      # configured to forward via Brevo/Resend credentials
```

This gives you the "run your own email server" feel locally while sidestepping the ISP port-25 problem cleanly.

**Transport consideration for Claude access:**
Since the Pi is local, stdio transport works if you run Claude Desktop on the same machine. But if you want to connect from claude.ai or remotely, you'd expose the MCP server via HTTP/SSE and use Tailscale (which you already have on your Pi) to reach it securely without opening ports.

Want me to update the spec to include the Docker/Raspberry Pi deployment section, or write a separate `docker-compose.yml` + `Dockerfile` spec alongside it?