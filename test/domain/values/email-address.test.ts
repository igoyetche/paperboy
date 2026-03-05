import { describe, it, expect } from "vitest";
import { EmailAddress } from "../../../src/domain/values/email-address.js";

describe("EmailAddress", () => {
  it("creates an EmailAddress from a valid email", () => {
    const result = EmailAddress.create("user@kindle.com");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("user@kindle.com");
    }
  });

  it("trims whitespace before validating", () => {
    const result = EmailAddress.create("  user@kindle.com  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("user@kindle.com");
    }
  });

  it("returns ValidationError for an address without @", () => {
    const result = EmailAddress.create("not-an-email");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.field).toBe("email");
    }
  });

  it("returns ValidationError for an address without domain", () => {
    const result = EmailAddress.create("user@");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
    }
  });

  it("uses custom field name in the error when provided", () => {
    const result = EmailAddress.create("bad", "device.email");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("device.email");
    }
  });
});
