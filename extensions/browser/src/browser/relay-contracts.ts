import { Type, type Static } from "@sinclair/typebox";
import AjvPkg, { type ErrorObject } from "ajv";

const Ajv = AjvPkg as unknown as new (opts?: object) => import("ajv").default;

const StrictUnknownRecord = Type.Record(Type.String(), Type.Unknown());
const QueryValue = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);

export const BrowserRelaySecurityDefaultsSchema = Type.Object(
  {
    exposure: Type.Literal("local-authenticated"),
    auth: Type.Literal("fail-closed"),
    allowUnknownFields: Type.Literal(false),
    allowPersistentProfileMutation: Type.Literal(false),
  },
  { additionalProperties: false },
);

export const BrowserRelayRequestParamsSchema = Type.Object(
  {
    method: Type.String({ minLength: 1 }),
    path: Type.String({ minLength: 1 }),
    query: Type.Optional(StrictUnknownRecord),
    body: Type.Optional(Type.Unknown()),
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  { additionalProperties: false },
);

export const BrowserProxyParamsSchema = Type.Object(
  {
    method: Type.Optional(Type.String({ minLength: 1 })),
    path: Type.String({ minLength: 1 }),
    query: Type.Optional(Type.Record(Type.String(), Type.Optional(QueryValue))),
    body: Type.Optional(Type.Unknown()),
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1 })),
    profile: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const BrowserRelayErrorSchema = Type.Object(
  {
    error: Type.String({ minLength: 1 }),
    code: Type.Optional(Type.String({ minLength: 1 })),
    status: Type.Optional(Type.Integer({ minimum: 400, maximum: 599 })),
    details: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

export type BrowserRelaySecurityDefaults = Static<typeof BrowserRelaySecurityDefaultsSchema>;
export type BrowserRelayRequestParams = Static<typeof BrowserRelayRequestParamsSchema>;
export type BrowserProxyParams = Static<typeof BrowserProxyParamsSchema>;
export type BrowserRelayError = Static<typeof BrowserRelayErrorSchema>;

export const BROWSER_RELAY_SECURITY_DEFAULTS = {
  exposure: "local-authenticated",
  auth: "fail-closed",
  allowUnknownFields: false,
  allowPersistentProfileMutation: false,
} as const satisfies BrowserRelaySecurityDefaults;

type BrowserRelayContractName = "browser.request" | "browser.proxy";

export type BrowserRelayContractValidation<T> =
  | { ok: true; value: T }
  | { ok: false; error: BrowserRelayError };

const ajv = new Ajv({ allErrors: true, strict: false });
const validateBrowserRelayRequestSchema = ajv.compile<BrowserRelayRequestParams>(
  BrowserRelayRequestParamsSchema,
);
const validateBrowserProxySchema = ajv.compile<BrowserProxyParams>(BrowserProxyParamsSchema);

function formatSchemaError(error: ErrorObject): string {
  if (error.keyword === "additionalProperties") {
    const prop = (error.params as { additionalProperty?: string }).additionalProperty;
    return prop ? `unknown field "${prop}"` : "unknown field";
  }
  const path = error.instancePath ? error.instancePath.slice(1).replaceAll("/", ".") : "params";
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    return missing ? `${missing} is required` : `${path} is required`;
  }
  if (error.keyword === "minLength") {
    return `${path} must be non-empty`;
  }
  if (error.keyword === "type") {
    return `${path} ${error.message ?? "has invalid type"}`;
  }
  return `${path} ${error.message ?? "is invalid"}`;
}

function invalidContract(
  contract: BrowserRelayContractName,
  errors: ErrorObject[] | null | undefined,
): BrowserRelayContractValidation<never> {
  const details = (errors ?? []).map(formatSchemaError);
  const suffix = details.length ? `: ${details.join("; ")}` : "";
  return {
    ok: false,
    error: {
      error: `${contract} params invalid${suffix}`,
      code: "INVALID_REQUEST",
      status: 400,
      details,
    },
  };
}

export function validateBrowserRelayRequestParams(
  value: unknown,
): BrowserRelayContractValidation<BrowserRelayRequestParams> {
  if (!validateBrowserRelayRequestSchema(value)) {
    return invalidContract("browser.request", validateBrowserRelayRequestSchema.errors);
  }
  return { ok: true, value };
}

export function validateBrowserProxyParams(
  value: unknown,
): BrowserRelayContractValidation<BrowserProxyParams> {
  if (!validateBrowserProxySchema(value)) {
    return invalidContract("browser.proxy", validateBrowserProxySchema.errors);
  }
  return { ok: true, value };
}
