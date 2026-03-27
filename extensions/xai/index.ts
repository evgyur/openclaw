import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";
import { createToolStreamWrapper } from "openclaw/plugin-sdk/provider-stream";
import { applyXaiModelCompat, buildXaiProvider } from "./api.js";
import {
  readConfiguredSecretString,
  resolveProviderWebSearchPluginConfig,
} from "openclaw/plugin-sdk/provider-web-search";
import { applyXaiConfig, XAI_DEFAULT_MODEL_REF } from "./onboard.js";
import { isModernXaiModel, resolveXaiForwardCompatModel } from "./provider-models.js";
import {
  createXaiToolCallArgumentDecodingWrapper,
  createXaiToolPayloadCompatibilityWrapper,
} from "./stream.js";
import { createXaiWebSearchProvider } from "./web-search.js";

const PROVIDER_ID = "xai";

function readLegacyGrokApiKey(config: Record<string, unknown>): string | undefined {
  const tools = config.tools;
  if (!tools || typeof tools !== "object") {
    return undefined;
  }
  const web = (tools as Record<string, unknown>).web;
  if (!web || typeof web !== "object") {
    return undefined;
  }
  const search = (web as Record<string, unknown>).search;
  if (!search || typeof search !== "object") {
    return undefined;
  }
  const grok = (search as Record<string, unknown>).grok;
  if (!grok || typeof grok !== "object") {
    return undefined;
  }
  return readConfiguredSecretString(
    (grok as Record<string, unknown>).apiKey,
    "tools.web.search.grok.apiKey",
  );
}

function resolveXaiProviderFallbackApiKey(config: unknown): string | undefined {
  if (!config || typeof config !== "object") {
    return undefined;
  }
  const record = config as Record<string, unknown>;
  return (
    readConfiguredSecretString(
      resolveProviderWebSearchPluginConfig(record, PROVIDER_ID)?.apiKey,
      "plugins.entries.xai.config.webSearch.apiKey",
    ) ?? readLegacyGrokApiKey(record)
  );
}

export default defineSingleProviderPluginEntry({
  id: "xai",
  name: "xAI Plugin",
  description: "Bundled xAI plugin",
  provider: {
    label: "xAI",
    aliases: ["x-ai"],
    docsPath: "/providers/xai",
    auth: [
      {
        methodId: "api-key",
        label: "xAI API key",
        hint: "API key",
        optionKey: "xaiApiKey",
        flagName: "--xai-api-key",
        envVar: "XAI_API_KEY",
        promptMessage: "Enter xAI API key",
        defaultModel: XAI_DEFAULT_MODEL_REF,
        applyConfig: (cfg) => applyXaiConfig(cfg),
        wizard: {
          groupLabel: "xAI (Grok)",
        },
      },
    ],
    catalog: {
      buildProvider: buildXaiProvider,
    },
    prepareExtraParams: (ctx) => {
      if (ctx.extraParams?.tool_stream !== undefined) {
        return ctx.extraParams;
      }
      return {
        ...ctx.extraParams,
        tool_stream: true,
      };
    },
    wrapStreamFn: (ctx) =>
      createToolStreamWrapper(
        createXaiToolCallArgumentDecodingWrapper(
          createXaiToolPayloadCompatibilityWrapper(ctx.streamFn),
        ),
        ctx.extraParams?.tool_stream !== false,
      ),
    resolveSyntheticAuth: ({ config }) => {
      const apiKey = resolveXaiProviderFallbackApiKey(config);
      if (!apiKey) {
        return undefined;
      }
      return {
        apiKey,
        source: "plugins.entries.xai.config.webSearch.apiKey",
        mode: "api-key" as const,
      };
    },
    normalizeResolvedModel: ({ model }) => applyXaiModelCompat(model),
    resolveDynamicModel: (ctx) => resolveXaiForwardCompatModel({ providerId: PROVIDER_ID, ctx }),
    isModernModelRef: ({ modelId }) => isModernXaiModel(modelId),
  },
  register(api) {
    api.registerWebSearchProvider(createXaiWebSearchProvider());
  },
});
