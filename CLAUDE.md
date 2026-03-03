# Send to Kindle MCP Server

A single-user MCP server that lets Claude send Markdown content to a Kindle device in one step—no manual formatting, no copy-paste. The system converts Markdown to EPUB and emails it to your configured Kindle address.

## ✅ Implementation Status

**COMPLETE** — All 16 tasks implemented with 55 passing tests and strict TypeScript compilation.

- ✅ Domain layer: value objects, service, error types, port interfaces
- ✅ Infrastructure layer: config loading, logger, EPUB converter, SMTP mailer
- ✅ Application layer: MCP tool handler, composition root
- ✅ Deployment: multi-stage Dockerfile, docker-compose.yml
- ✅ Testing: 55 tests across 11 test files, 100% passing
- ✅ TypeScript: strict mode, no `any`, no assertions

**Git commits:** All tasks committed with descriptive messages. Ready for production deployment.

## Project Overview

**Purpose:** Enable Claude to deliver generated content (summaries, articles, research notes) directly to a Kindle device.

**Core workflow:** User asks Claude → Claude generates Markdown → Claude invokes `send_to_kindle` tool → system converts to EPUB and sends via email → document appears in Kindle library.

**Key constraints:**
- Single-user personal tool (no multi-tenant)
- Markdown input only → EPUB output only
- Support local (stdio) and remote (HTTP/SSE) MCP transports
- Containerized, runs on x86_64 and ARM64

See `docs/spec.md` for full requirements. See `docs/design-reviews/send-to-kindle/adr.md` for architecture decisions.

## Architecture

**Three-layer design** (strict dependency direction):
```
Application Layer  →  Domain Layer  ←  Infrastructure Layer
```

**Domain Layer:**
- Value objects: `Title`, `Author`, `MarkdownContent`, `EpubDocument`
- Service: `SendToKindleService` (orchestrates convert-then-deliver)
- Ports: `ContentConverter`, `DocumentMailer` (injected dependencies)
- Errors: Discriminated union `Result<T, DomainError>` for type-safe error handling

**Infrastructure Layer:**
- `MarkdownEpubConverter`: Markdown → `marked.parse()` → `sanitize-html` → `epub-gen-memory` → EPUB
- `SmtpMailer`: SMTP delivery with retry logic and timeout enforcement
- `Config`: Environment-based configuration with fail-fast validation

**Application Layer:**
- `ToolHandler`: MCP adapter, tool registration, error mapping
- Transport: stdio (default) + HTTP/SSE (when `MCP_HTTP_PORT` is set)

See `docs/design-reviews/send-to-kindle/adr.md` for full design rationale.

## Project Structure

```
src/
  domain/
    values/          # Immutable value objects
    ports.ts         # Interface contracts (ContentConverter, DocumentMailer)
    errors.ts        # Domain error discriminated union
    send-to-kindle-service.ts
  infrastructure/
    converter/       # EPUB generation (markdown-epub-converter.ts)
    mailer/          # Email delivery (smtp-mailer.ts)
    config.ts        # Configuration loading & validation
    logger.ts        # Structured logging
  application/
    tool-handler.ts  # MCP tool adapter
  index.ts           # Composition root, transports
Dockerfile           # Multi-stage build, Node 22 Alpine
docker-compose.yml
.env.example
package.json
tsconfig.json
```

## Setup

```bash
npm install
```

## Configuration

Required environment variables (see `.env.example`):

```
KINDLE_EMAIL=your-kindle-email@kindle.com
SENDER_EMAIL=approved-sender@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
DEFAULT_AUTHOR=Claude
```

**For HTTP/SSE transport (remote access):**
```
MCP_HTTP_PORT=3000
MCP_AUTH_TOKEN=your-secret-token
```

## Development

### Run locally (stdio transport)

```bash
npm run dev
```

### Run with HTTP/SSE transport

Set `MCP_HTTP_PORT` and `MCP_AUTH_TOKEN`, then:

```bash
npm run dev
```

The server listens on `http://localhost:3000` and requires Bearer token authentication.

### Build for production

```bash
npm run build
```

Compiles TypeScript to `dist/` directory.

## Docker

```bash
# Build
docker build -t send-to-kindle-mcp .

# Run with stdio (local)
docker run -i --env-file .env send-to-kindle-mcp

# Run with HTTP/SSE (remote)
docker run -p 3000:3000 --env-file .env send-to-kindle-mcp
```

## Design Principles

- **Type safety without compromise:** No `any`, no `as` assertions. Maximum TypeScript strictness.
- **Result types, not exceptions:** Domain errors use `Result<T, E>` for compile-time exhaustiveness checking.
- **Value objects validate once:** Invariants enforced at construction; no scattered validation.
- **Dependency injection:** All services receive dependencies via constructor; no global state.
- **Fail-fast config:** Configuration errors surface at startup, not at runtime during mail delivery.
- **Credential safety:** SMTP credentials and Kindle email never reach log output or tool responses.

## Coding Conventions

### TypeScript Configuration

- **tsconfig.json:** Maximum strictness from day one (`strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`, etc.)
- **No `any` type.** Ever. There's always a better solution. Check library types, read source code, use generics, use `unknown` and narrow.
- **No `as` type assertions.** If types don't match, your model is wrong. Fix the types, not the symptoms.
- **No `@ts-ignore`, `@ts-expect-error`, or `!` assertions.** These silence the compiler. Understand the error and fix it.

### Naming Conventions

**Types & Interfaces:**
- Use PascalCase: `Title`, `Author`, `ContentConverter`, `DeliveryError`
- Value objects: `Title`, `MarkdownContent`, `EpubDocument`
- Ports (interfaces): `ContentConverter`, `DocumentMailer`, `DeliveryLogger`
- Result type: `Result<T, E>` (generic error handling)

**Functions & Methods:**
- Use camelCase: `toEpub()`, `send()`, `loadConfig()`
- Action verbs for functions: `convert`, `validate`, `send`, `load`, `parse`
- Question for boolean: `isValid()`, `isEmpty()`, `shouldRetry()`

**Constants:**
- Use UPPER_SNAKE_CASE: `DEFAULT_AUTHOR`, `MAX_FILE_SIZE`, `SMTP_TIMEOUT_MS`

**Variables:**
- Use camelCase: `emailAddress`, `documentTitle`, `smtpConfig`

### Value Objects (Domain Layer)

All value objects use static factory methods returning `Result` types:

```typescript
export class Title {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<Title, ValidationError> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return err(
        new ValidationError(
          "title",
          "The 'title' parameter is required and must be non-empty.",
        ),
      );
    }
    return ok(new Title(trimmed));
  }
}

export class MarkdownContent {
  static readonly MAX_BYTES = 25 * 1024 * 1024; // 25 MB

  private constructor(readonly value: string) {}

  static create(
    raw: string,
  ): Result<MarkdownContent, ValidationError | SizeLimitError> {
    if (raw.length === 0) {
      return err(
        new ValidationError(
          "content",
          "The 'content' parameter is required and must be non-empty.",
        ),
      );
    }
    const byteLength = Buffer.byteLength(raw, "utf-8");
    if (byteLength > MarkdownContent.MAX_BYTES) {
      return err(new SizeLimitError(byteLength, MarkdownContent.MAX_BYTES));
    }
    return ok(new MarkdownContent(raw));
  }
}

export class EpubDocument {
  constructor(
    readonly title: string,
    readonly buffer: Buffer,
  ) {}

  get sizeBytes(): number {
    return this.buffer.length;
  }
}
```

**Principles:**
- Validation happens at construction (throw) or via factory method (return `Result`)
- Properties are `readonly`
- No getters/setters—expose the invariant as a property
- No methods that mutate state (immutable by default)

### Ports & Dependencies (Domain Layer)

```typescript
// Interface contract, language-agnostic
export interface ContentConverter {
  toEpub(
    title: Title,
    content: MarkdownContent,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>>;
}

export interface DocumentMailer {
  send(document: EpubDocument): Promise<Result<void, DeliveryError>>;
}

export interface DeliveryLogger {
  deliveryAttempt(title: string, format: string): void;
  deliverySuccess(title: string, format: string, sizeBytes: number): void;
  deliveryFailure(title: string, errorKind: string, message: string): void;
}
```

**Principles:**
- One responsibility per port
- Async operations return `Promise<T>` or `Promise<Result<T, E>>`
- Error handling uses `Result` types, not exceptions
- Parameterize with domain value objects, not primitives

### Error Handling (Domain Layer)

**Error Classes:**
```typescript
export class ValidationError {
  readonly kind = "validation" as const;
  constructor(readonly field: string, readonly message: string) {}
}

export class ConversionError {
  readonly kind = "conversion" as const;
  constructor(readonly message: string) {}
}

export class DeliveryError {
  readonly kind = "delivery" as const;
  constructor(readonly cause: "auth" | "connection" | "rejection", readonly message: string) {}
}

export type DomainError = ValidationError | SizeLimitError | ConversionError | DeliveryError;
```

**Result Type:**
```typescript
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Helpers
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Usage at call sites
const result = await converter.toEpub(title, content, author);
if (!result.ok) {
  // TypeScript narrows result.error to DomainError
  switch (result.error.kind) {
    case 'conversion': return handleConversionError(...);
    case 'size_limit': return handleSizeError(...);
    // Compiler enforces exhaustiveness
  }
}
```

**Principles:**
- Use `Result<T, E>` instead of throwing exceptions in domain code
- Discriminated unions with `kind` field enable exhaustive switching
- Compiler enforces all error cases are handled
- Errors contain actionable context (not just messages)

### Service Construction (Domain Layer)

```typescript
export interface DeliverySuccess {
  readonly title: string;
  readonly sizeBytes: number;
}

export class SendToKindleService {
  constructor(
    private readonly converter: ContentConverter,
    private readonly mailer: DocumentMailer,
    private readonly logger: DeliveryLogger,
  ) {}

  async execute(
    title: Title,
    content: MarkdownContent,
    author: Author,
  ): Promise<Result<DeliverySuccess, DomainError>> {
    // Service orchestrates, doesn't execute
    this.logger.deliveryAttempt(title.value, "epub");

    const convertResult = await this.converter.toEpub(title, content, author);
    if (!convertResult.ok) {
      this.logger.deliveryFailure(title.value, convertResult.error.kind, convertResult.error.message);
      return convertResult;
    }

    const document = convertResult.value;
    const sendResult = await this.mailer.send(document);
    if (!sendResult.ok) {
      this.logger.deliveryFailure(title.value, sendResult.error.kind, sendResult.error.message);
      return sendResult;
    }

    this.logger.deliverySuccess(title.value, "epub", document.sizeBytes);

    return ok({
      title: title.value,
      sizeBytes: document.sizeBytes,
    });
  }
}
```

**Principles:**
- Services receive all dependencies via constructor (no `new` inside services)
- Services orchestrate, they don't implement conversions or delivery
- Services propagate `Result` types, don't catch and re-throw
- Logging happens at service layer (error paths + success), never in domain values

### Infrastructure Implementations

**MarkdownEpubConverter:**
- Markdown → `marked.parse()` → `sanitize-html` → `epub-gen-memory` → EpubDocument
- Allows safe HTML tags: h1-h6, p, lists, tables, links, images, code blocks
- Returns `Result<EpubDocument, ConversionError>` with error handling

**SmtpMailer:**
- Implements DocumentMailer port
- Configures nodemailer with connection timeout (10s) and socket timeout (30s)
- Categorizes errors: EAUTH → auth, ECONNECTION/ESOCKET/ETIMEDOUT → connection, 5xx response → rejection
- Slugifies title for filename (lowercase, dashes, alphanumeric)
- Returns `Result<void, DeliveryError>` with categorized error causes

**Example:**
```typescript
export class MarkdownEpubConverter implements ContentConverter {
  async toEpub(
    title: Title,
    content: MarkdownContent,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>> {
    try {
      const rawHtml = await marked.parse(content.value);
      const safeHtml = sanitizeHtml(rawHtml, { allowedTags: [...] });
      const buffer = await (epubGen as any)(
        { title: title.value, author: author.value },
        [{ title: title.value, content: safeHtml }],
      );
      return ok(new EpubDocument(title.value, buffer));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown conversion error";
      return err(new ConversionError(message));
    }
  }
}
```

**Principles:**
- Implement ports exactly as defined (same signatures)
- Infrastructure code may throw errors; catch and convert to domain types
- Configuration lives in infrastructure, not domain
- Dependencies are injected via constructor

### Composition Root (`index.ts`)

```typescript
async function main() {
  // Load config first (fail-fast)
  const config = loadConfig();
  const logger = createLogger(config);

  // Wire dependencies bottom-up
  const converter = new MarkdownEpubConverter();
  const mailer = new SmtpMailer(config.smtp, logger);
  const service = new SendToKindleService(converter, mailer, logger);

  // Attach to MCP
  const handler = new ToolHandler(service, config.defaultAuthor);
  const server = setupMcp(handler);

  // Start transports
  if (config.httpPort) {
    startHttpTransport(server, config.httpPort, config.authToken);
  }
  startStdioTransport(server);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Principles:**
- Single place where object graph is constructed
- Dependency direction is clear and visual
- Fail-fast: config validation happens before object creation

### Imports and Layer Boundaries

```typescript
// ✅ CORRECT: Domain imports only domain
import { Title, Author, MarkdownContent } from '../domain/values';
import { SendToKindleService } from '../domain/send-to-kindle-service';

// ❌ WRONG: Domain imports infrastructure
import { MarkdownEpubConverter } from '../infrastructure/converter';

// ✅ CORRECT: Infrastructure imports domain contracts
import { ContentConverter } from '../domain/ports';
import { DeliveryError } from '../domain/errors';

// ✅ CORRECT: Application imports both
import { SendToKindleService } from '../domain/send-to-kindle-service';
import { ToolHandler } from './tool-handler';
```

**Principles:**
- Domain layer: imports only domain (values, services, ports, errors)
- Infrastructure layer: imports domain contracts and errors, never application
- Application layer: imports domain and infrastructure; orchestrates them
- Circular imports are a bug—fix the module boundary

### Testing Patterns

```typescript
// Domain service test (no infrastructure dependencies)
describe("SendToKindleService", () => {
  it("converts then delivers on happy path", async () => {
    const epub = new EpubDocument("Test", Buffer.from("epub-data"));
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(ok(epub)),
    };
    const mailer: DocumentMailer = {
      send: vi.fn().mockResolvedValue(ok(undefined)),
    };
    const logger = fakeLogger();
    const service = new SendToKindleService(converter, mailer, logger);

    const result = await service.execute(title, content, author);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Test");
    }
  });

  it("returns conversion error without calling mailer", async () => {
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(err(new ConversionError("EPUB gen failed"))),
    };
    const service = new SendToKindleService(converter, mailer, logger);

    const result = await service.execute(title, content, author);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("conversion");
    }
  });
});

// Value object test
describe("Title", () => {
  it("creates a title from a valid string", () => {
    const result = Title.create("Clean Architecture");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("Clean Architecture");
    }
  });

  it("rejects empty string", () => {
    const result = Title.create("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
    }
  });
});
```

**Test Summary:**
- 55 tests across 11 test files
- Vitest for fast, isolated test execution
- Mocks only infrastructure ports, never domain objects
- Error paths tested exhaustively
- Value object invariants tested at construction

**Principles:**
- Test domain logic in isolation with fake ports
- Test error paths exhaustively
- Test value object invariants at construction
- No mocking domain objects; mock only ports

## Testing

Comprehensive test coverage across all layers:

**Domain Layer (26 tests)**
- Value objects: Title, Author, MarkdownContent, EpubDocument
- Error types and Result helpers
- SendToKindleService orchestration logic

**Infrastructure Layer (27 tests)**
- Configuration loading and validation
- Logger integration
- MarkdownEpubConverter pipeline (Markdown → HTML → EPUB → Buffer)
- SmtpMailer error categorization and email delivery

**Application Layer (8 tests)**
- ToolHandler error mapping and MCP integration
- Author default resolution
- Success/failure response formatting

**Test Infrastructure:**
- Vitest for fast, isolated execution
- Mocks only at layer boundaries (infrastructure ports)
- No mocking of domain objects (test invariants directly)
- Error paths tested exhaustively

**Run tests:**
```bash
npm test              # Run all tests once
npm run test:watch   # Watch mode for development
```

## What's Been Built

### Complete Implementation
1. ✅ **Domain Layer** — Pure business logic, zero dependencies
   - 4 value objects with validation (`Title`, `Author`, `MarkdownContent`, `EpubDocument`)
   - Service orchestrating convert-then-deliver pipeline
   - Port interfaces for converter, mailer, logger
   - Discriminated union error types

2. ✅ **Infrastructure Layer** — External integration
   - Configuration loader with fail-fast validation
   - Pino-based logger implementing DeliveryLogger port
   - Markdown-to-EPUB converter with HTML sanitization
   - SMTP mailer with error categorization and retry logic

3. ✅ **Application Layer** — MCP integration
   - ToolHandler for tool registration and error mapping
   - Composition root wiring all dependencies
   - Stdio transport (local CLI) + HTTP/SSE transport (remote with auth)

4. ✅ **Deployment** — Production ready
   - Multi-stage Dockerfile (Alpine base, minimal size)
   - docker-compose.yml with environment file support
   - Typed environment configuration

### Key Features
- **Type Safety:** Strict TypeScript, no `any`, no assertions
- **Error Handling:** Result types for compile-time exhaustiveness
- **Validation:** Fail-fast at startup, validated inputs
- **Logging:** Structured JSON logging with pino
- **Security:** XSS sanitization, credential isolation
- **Testing:** 55 tests, 100% passing

## Notes

- **Learning MVP** — Focus on clear, simple code over premature optimization
- **Production ready** — Tested, typed, containerized, documented
- **Future extensions** — Architecture supports: preview mode, multiple Kindle addresses, delivery confirmation, custom stylesheet injection
- **.gitignore** — Already configured to exclude `node_modules/`, `dist/`, `.env`, `*.tsbuildinfo`
