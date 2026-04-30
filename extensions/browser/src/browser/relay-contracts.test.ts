import AjvPkg from "ajv";
import { describe, expect, it } from "vitest";
import { BrowserToolSchema } from "../browser-tool.schema.js";
import {
  BROWSER_RELAY_SECURITY_DEFAULTS,
  BrowserProxyParamsSchema,
  BrowserRelayErrorSchema,
  BrowserRelayRequestParamsSchema,
  BrowserRelaySecurityDefaultsSchema,
  validateBrowserProxyParams,
  validateBrowserRelayRequestParams,
} from "./relay-contracts.js";

const Ajv = AjvPkg as unknown as new (opts?: object) => import("ajv").default;

function compile(schema: object) {
  return new Ajv({ allErrors: true, strict: false }).compile(schema);
}

describe("browser relay contracts", () => {
  it("defines fail-closed local relay security defaults", () => {
    const validate = compile(BrowserRelaySecurityDefaultsSchema);

    expect(validate(BROWSER_RELAY_SECURITY_DEFAULTS)).toBe(true);
    expect(BROWSER_RELAY_SECURITY_DEFAULTS).toEqual({
      exposure: "local-authenticated",
      auth: "fail-closed",
      allowUnknownFields: false,
      allowPersistentProfileMutation: false,
    });
  });

  it("accepts the minimal browser.request contract", () => {
    const result = validateBrowserRelayRequestParams({
      method: "POST",
      path: "/act",
      query: { profile: "work" },
      body: { request: { action: "click", ref: "btn1" } },
      timeoutMs: 1000,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown browser.request fields", () => {
    const result = validateBrowserRelayRequestParams({
      method: "GET",
      path: "/tabs",
      unsafeExtra: true,
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "INVALID_REQUEST",
        status: 400,
        error: expect.stringContaining('unknown field "unsafeExtra"'),
      }),
    });
  });

  it("rejects missing browser.request method and path", () => {
    const result = validateBrowserRelayRequestParams({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error).toContain("method is required");
      expect(result.error.error).toContain("path is required");
    }
  });

  it("accepts browser.proxy defaults while rejecting unknown fields", () => {
    expect(validateBrowserProxyParams({ path: "/snapshot" }).ok).toBe(true);

    const result = validateBrowserProxyParams({ path: "/snapshot", relayToken: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error).toContain('unknown field "relayToken"');
    }
  });

  it("keeps the agent browser tool schema strict and flattened", () => {
    expect(BrowserToolSchema.type).toBe("object");
    expect("anyOf" in BrowserToolSchema).toBe(false);
    expect(BrowserToolSchema.additionalProperties).toBe(false);

    const validate = compile(BrowserToolSchema);
    expect(validate({ action: "snapshot", target: "host" })).toBe(true);
    expect(validate({ action: "snapshot", target: "host", unsafeExtra: true })).toBe(false);
  });

  it("keeps the relay error envelope strict", () => {
    const validate = compile(BrowserRelayErrorSchema);

    expect(validate({ error: "blocked", code: "INVALID_REQUEST", status: 400 })).toBe(true);
    expect(validate({ error: "blocked", status: 200 })).toBe(false);
    expect(validate({ error: "blocked", status: 400, extra: true })).toBe(false);
  });

  it("compiles request and proxy schemas as JSON schema objects", () => {
    expect(compile(BrowserRelayRequestParamsSchema)({ method: "GET", path: "/" })).toBe(true);
    expect(compile(BrowserProxyParamsSchema)({ path: "/", method: "GET" })).toBe(true);
  });
});
