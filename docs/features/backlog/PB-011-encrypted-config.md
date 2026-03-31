# PB-011: Encrypted Configuration Storage

## Motivation

Sensitive configuration values (SMTP password, MCP auth token) are currently stored as plaintext in `.env` files. This risks accidental exposure through git commits, log output, error messages, screen sharing, or file backups. The system should encrypt secrets at rest and retrieve the decryption key from a secure, platform-appropriate source.

## Scope

- Encrypt sensitive configuration values at rest in a local file (e.g., `.env.enc`)
- Decrypt at startup using a master key sourced from a platform-appropriate secure store
- Local (Windows): retrieve master key from Windows Credential Manager
- Docker: retrieve master key from Docker secrets (`/run/secrets/`)
- Provide a CLI command to create/update the encrypted config file
- Existing plaintext `.env` continues to work as a fallback (for development convenience)

## Acceptance Criteria

1. Sensitive values (`SMTP_PASS`, `MCP_AUTH_TOKEN`) are stored encrypted on disk
2. The master key is never stored as a plaintext file or environment variable in production use
3. On Windows, the master key is stored in Windows Credential Manager (DPAPI-protected)
4. In Docker, the master key is read from Docker secrets (in-memory mount)
5. A CLI subcommand exists to encrypt/re-encrypt the config file (e.g., `paperboy config encrypt`)
6. The system falls back to plaintext `.env` when no encrypted config is present
7. Encrypted config file is safe to commit to version control
8. No secrets appear in log output, error messages, or stack traces (existing behavior preserved)

## Out of Scope

- Multi-user access control
- Remote secret management services (e.g., AWS Secrets Manager, HashiCorp Vault)
- macOS Keychain / Linux Secret Service support (can be added later)
