import { STALI_ANTHROPIC_BASE_URL, STALI_OPENAI_BASE_URL } from "../../constants/api";
import { getToolById } from "../../utils/tool-utils";
import { maskToken } from "../../utils/token";

export function buildToolConfigPreview(
  toolId: string,
  apiKey: string,
  model: string
): Record<string, unknown> {
  const masked = apiKey ? maskToken(apiKey) : "sk-stali-...";
  const tool = getToolById(toolId);

  switch (toolId) {
    case "claude":
      return {
        hasCompletedOnboarding: true,
        env: {
          ANTHROPIC_BASE_URL: STALI_ANTHROPIC_BASE_URL,
          ANTHROPIC_AUTH_TOKEN: masked,
          API_TIMEOUT_MS: "600000",
          ANTHROPIC_MODEL: model,
        },
      };
    case "codex":
      return {
        model,
        model_provider: "stali",
        model_providers: {
          stali: {
            name: "Stali API",
            base_url: STALI_OPENAI_BASE_URL,
            wire_api: "responses",
          },
        },
        auth: { OPENAI_API_KEY: masked },
      };
    case "openclaw":
      return anthropicEnvPreview(masked, model);
    case "deepseek-tui":
    case "grok-build":
    case "jcode":
      return {
        provider: "openai",
        base_url: STALI_OPENAI_BASE_URL,
        api_key: masked,
        model,
      };
    case "qwen":
      return {
        security: {
          auth: {
            selectedType: "openai",
            apiKey: masked,
            baseUrl: STALI_OPENAI_BASE_URL,
          },
        },
        model: { name: model },
      };
    case "opencode":
      return {
        defaultProvider: "stali",
        model,
        provider: {
          stali: {
            name: "Stali API",
            options: {
              baseURL: STALI_OPENAI_BASE_URL,
              apiKey: masked,
            },
          },
        },
      };
    case "cline":
    case "roo":
    case "kilo":
      return {
        apiProvider: "anthropic",
        anthropicApiKey: masked,
        anthropicBaseUrl: STALI_ANTHROPIC_BASE_URL,
        anthropicModelId: model,
      };
    case "droid":
      return {
        provider: {
          type: "openai",
          baseUrl: STALI_OPENAI_BASE_URL,
          apiKey: masked,
        },
        model,
      };
    case "cowork":
      return {
        openai: {
          baseUrl: STALI_OPENAI_BASE_URL,
          apiKey: masked,
          model,
        },
        defaultModel: model,
      };
    default:
      return {
        tool: tool?.name || toolId,
        model,
        configFile: tool?.configFile,
      };
  }
}

function anthropicEnvPreview(masked: string, model: string) {
  return {
    hasCompletedOnboarding: true,
    env: {
      ANTHROPIC_BASE_URL: STALI_ANTHROPIC_BASE_URL,
      ANTHROPIC_AUTH_TOKEN: masked,
      ANTHROPIC_MODEL: model,
      API_TIMEOUT_MS: "600000",
    },
  };
}
