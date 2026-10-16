import { resolveStaliUrls } from "../../utils/stali-urls";
import { getToolById } from "../../utils/tool-utils";
import { maskToken } from "../../utils/token";

export function buildToolConfigPreview(
  toolId: string,
  apiKey: string,
  model: string,
  baseUrl?: string
): Record<string, unknown> {
  const urls = resolveStaliUrls(baseUrl);
  const masked = apiKey ? maskToken(apiKey) : "sk-stali-...";
  const tool = getToolById(toolId);

  switch (toolId) {
    case "claude":
      return {
        hasCompletedOnboarding: true,
        env: {
          ANTHROPIC_BASE_URL: urls.anthropicBaseUrl,
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
            base_url: urls.openAiBaseUrl,
            wire_api: "responses",
          },
        },
        auth: { OPENAI_API_KEY: masked },
      };
    case "openclaw":
      return {
        models: {
          providers: {
            stali: {
              baseUrl: urls.openAiBaseUrl,
              apiKey: masked,
              api: "openai-completions",
              models: [{ id: model, name: model }],
            },
          },
        },
        agents: { defaults: { model: { primary: `stali/${model}` } } },
      };
    case "deepseek-tui":
      return {
        provider: "openai",
        base_url: urls.openAiBaseUrl,
        api_key: masked,
        model,
      };
    case "grok-build":
      return {
        models: { default: model },
        model_providers: {
          stali: {
            api_base_url: urls.openAiBaseUrl,
            api_key: masked,
            api_backend: "chat_completions",
          },
        },
      };
    case "jcode":
      return {
        provider: { default_provider: "stali", default_model: model },
        providers: {
          stali: {
            type: "openai-compatible",
            base_url: urls.openAiBaseUrl,
            api_key: masked,
            models: [{ id: model }],
          },
        },
      };
    case "qwen":
      return {
        security: {
          auth: {
            selectedType: "openai",
            apiKey: masked,
            baseUrl: urls.openAiBaseUrl,
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
              baseURL: urls.openAiBaseUrl,
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
        anthropicBaseUrl: urls.anthropicBaseUrl,
        anthropicModelId: model,
      };
    case "droid":
      return {
        customModels: [
          {
            model,
            displayName: `Stali: ${model}`,
            provider: "generic-chat-completion-api",
            baseUrl: urls.openAiBaseUrl,
            apiKey: masked,
          },
        ],
      };
    case "cowork":
      return {
        openai: {
          baseUrl: urls.openAiBaseUrl,
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
        baseUrl: urls.openAiBaseUrl,
      };
  }
}

function anthropicEnvPreview(masked: string, model: string, anthropicBaseUrl: string) {
  return {
    hasCompletedOnboarding: true,
    env: {
      ANTHROPIC_BASE_URL: anthropicBaseUrl,
      ANTHROPIC_AUTH_TOKEN: masked,
      ANTHROPIC_MODEL: model,
      API_TIMEOUT_MS: "600000",
    },
  };
}
