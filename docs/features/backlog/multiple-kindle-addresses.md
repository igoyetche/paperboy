# Feature: Multiple Kindle Addresses

> Status: Backlog
> Created: 2026-03-05
> Completed: —

## Problem

The system currently supports a single `KINDLE_EMAIL` address. Users with multiple Kindle devices (personal, partner, family) must reconfigure the server to switch targets.

## Proposed Solution

Support a comma-separated list of Kindle addresses in configuration, and add an optional `device` parameter to the `send_to_kindle` tool to select which address to send to.

### Configuration

```
# Single address (backwards compatible)
KINDLE_EMAIL=personal@kindle.com

# Multiple addresses (new)
KINDLE_EMAIL=personal@kindle.com,partner@kindle.com,family@kindle.com
KINDLE_DEVICE_NAMES=personal,partner,family
```

`KINDLE_DEVICE_NAMES` provides human-friendly aliases mapped by position to the addresses in `KINDLE_EMAIL`. If omitted, devices are referenced by index (0, 1, 2).

### Tool Parameter

Add an optional `device` parameter to `send_to_kindle`:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `device` | string | no | Device name or index. Defaults to the first address. Use `"all"` to send to every configured address. |

### Examples

```
send_to_kindle(title: "Article", content: "...", device: "partner")
send_to_kindle(title: "Article", content: "...", device: "all")
send_to_kindle(title: "Article", content: "...")  // sends to first address
```

## Changes Required

- **Config**: parse `KINDLE_EMAIL` as comma-separated list, add optional `KINDLE_DEVICE_NAMES`
- **Domain**: `DocumentMailer.send()` accepts a target address (or list)
- **SmtpMailer**: send to one or multiple addresses
- **ToolHandler**: resolve `device` parameter to address(es)
- **Validation**: reject unknown device names with a clear error listing available devices

## Scope

Small change — config parsing, one new optional parameter, loop in the mailer. No architectural changes needed.
