import React, { useState, useEffect } from "react";
import { Box, useApp } from "ink";
import { Header } from "./components/Header";
import { TokenInput } from "./TokenInput";
import { MainMenu } from "./MainMenu";
import { PriceTable } from "./PriceTable";
import { AppSelect } from "./AppSelect";
import { ToolDetailMenu, ToolMenuAction } from "./ToolDetailMenu";
import { ClaudeDraftConfig } from "./tools/ClaudeDetailMenu";
import { CodexDraftConfig } from "./tools/CodexDetailMenu";
import { ModelSelect } from "./ModelSelect";
import { ContextSelect } from "./ContextSelect";
import { ManualInput } from "./ManualInput";
import { ConfigReview } from "./ConfigReview";
import { SetupDone } from "./SetupDone";
import { DoctorView } from "./DoctorView";
import { StaliModel, SyncerResult } from "../types";
import { loadStaliConfig, saveStaliConfig, loadStaliConfigOrCorrupt } from "../services/config";
import { validateApiKeyAndFetchModels } from "../services/api";
import {
  getClaudeStatus,
  saveClaudeFullSettings,
  resetClaudeSettings,
} from "../services/syncers/claude";
import {
  getCodexStatus,
  patchCodexSettings,
  resetCodexSettings,
} from "../services/syncers/codex";
import { syncTool, resetTool, runDoctorScan } from "../services/syncers";
import { buildToolConfigPreview } from "../services/syncers/preview";
import { runDoctorFix } from "../services/doctor-fix";
import { runConfigureBatch } from "../services/configure-batch";
import { ConfigureAllMenu, ConfigureAllAction } from "./ConfigureAllMenu";
import { InstallMenu, InstallMenuAction } from "./InstallMenu";
import { PluginsMenu, PluginsMenuAction } from "./PluginsMenu";
import { runPluginsDoctor, type PluginHealthStatus } from "../services/plugin-doctor";
import { runPluginsSync } from "../services/plugin-sync";
import { loadPlugins } from "../services/plugins";
import { getToolById } from "../utils/tool-utils";
import { resolveToolDefaultModel } from "../utils/tool-utils";

interface WizardProps {
  initialKey?: string;
}

type WizardStep =
  | "token"
  | "menu"
  | "pricing"
  | "doctor"
  | "configure-all"
  | "install"
  | "plugins"
  | "app"
  | "tool-detail"
  | "model"
  | "manual-model"
  | "context"
  | "manual-context"
  | "review"
  | "done";

export const Wizard: React.FC<WizardProps> = ({ initialKey }) => {
  const { exit } = useApp();
  const [step, setStep] = useState<WizardStep>("token");
  const [apiKey, setApiKey] = useState<string>(initialKey || "");
  const [models, setModels] = useState<StaliModel[]>([]);
  const [apiDefaultModel, setApiDefaultModel] = useState<string>("claude-fable-5");
  const [selectedTool, setSelectedTool] = useState<string>("claude");
  const [selectedTier, setSelectedTier] = useState<
    "fable" | "sonnet" | "opus" | "haiku" | "all"
  >("all");
  const [selectedModel, setSelectedModel] = useState<string>("claude-fable-5");
  const [genericModel, setGenericModel] = useState<string>("claude-fable-5");
  const [claudeDraft, setClaudeDraft] = useState<ClaudeDraftConfig>({
    fable: "claude-fable-5",
    opus: "claude-fable-5",
    sonnet: "claude-sonnet-5",
    haiku: "claude-haiku-4-5",
    context: "",
  });
  const [codexDraft, setCodexDraft] = useState<CodexDraftConfig>({
    model: "req/gpt-5.6-sol",
    subagentModel: "",
  });
  const [doctorStatuses, setDoctorStatuses] = useState<Awaited<ReturnType<typeof runDoctorScan>>>([]);
  const [pluginStatuses, setPluginStatuses] = useState<PluginHealthStatus[]>([]);
  const [pluginCount, setPluginCount] = useState(0);
  const [doctorReturnStep, setDoctorReturnStep] = useState<"menu" | "plugins">("menu");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [results, setResults] = useState<SyncerResult[]>([]);
  const [installModeLabel, setInstallModeLabel] = useState<string>("");

  const refreshInstallMode = async () => {
    const { detectInstallMode } = await import("../services/install-mode");
    const info = await detectInstallMode();
    setInstallModeLabel(info.mode);
  };

  const isAdvancedTool = (toolId: string) =>
    toolId === "claude" || toolId === "codex";

  const isGenericFlowTool = (toolId: string) =>
    !isAdvancedTool(toolId);

  const loadUnifiedDoctor = async () => {
    const [tools, pluginReport] = await Promise.all([
      runDoctorScan(),
      runPluginsDoctor(),
    ]);
    setDoctorStatuses(tools);
    setPluginStatuses(pluginReport.plugins);
  };

  useEffect(() => {
    async function init() {
      if (initialKey) {
        handleTokenSubmit(initialKey);
        return;
      }

      const { config, corrupt } = await loadStaliConfigOrCorrupt();
      if (corrupt) {
        setError("File ~/.stali/config.json bị lỗi định dạng. Vui lòng nhập token lại.");
        setStep("token");
        return;
      }

      if (config?.apiKey) {
        setApiKey(config.apiKey);
        setLoading(true);
        const res = await validateApiKeyAndFetchModels(config.apiKey, {
          baseUrl: config.baseUrl,
        });
        setLoading(false);
        if (res.valid) {
          setModels(res.models);
          setApiDefaultModel(res.defaultModel);
          setStep("menu");
          await refreshInstallMode();
        } else {
          setError(res.error || "Token đã lưu không hợp lệ. Vui lòng nhập lại.");
          setStep("token");
        }
      }
    }
    init();
  }, [initialKey]);

  const handleTokenSubmit = async (token: string) => {
    setLoading(true);
    setError(undefined);

    const res = await validateApiKeyAndFetchModels(token);
    setLoading(false);

    if (res.valid) {
      setApiKey(token);
      setModels(res.models);
      setApiDefaultModel(res.defaultModel);
      await saveStaliConfig({ apiKey: token });
      setStep("menu");
      await refreshInstallMode();
    } else {
      setError(res.error || "Token không hợp lệ");
    }
  };

  const handleMenuSelect = async (
    action:
      | "configure"
      | "configure-all"
      | "models"
      | "change-key"
      | "doctor"
      | "fix-all"
      | "open-keys"
      | "update"
      | "install"
      | "completion"
      | "plugins"
      | "exit"
  ) => {
    switch (action) {
      case "configure":
        setStep("app");
        break;
      case "configure-all":
        setPluginCount((await loadPlugins()).length);
        setStep("configure-all");
        break;
      case "models":
        setStep("pricing");
        break;
      case "doctor":
        setLoading(true);
        setDoctorReturnStep("menu");
        await loadUnifiedDoctor();
        setLoading(false);
        setStep("doctor");
        break;
      case "fix-all":
        await handleDoctorFix();
        break;
      case "plugins": {
        const plugins = await loadPlugins();
        setPluginCount(plugins.length);
        setStep("plugins");
        break;
      }
      case "install":
        await refreshInstallMode();
        setStep("install");
        break;
      case "update": {
        setLoading(true);
        setError(undefined);
        const { selfUpdate } = await import("../services/self-update");
        const res = await selfUpdate();
        setLoading(false);
        if (res.success) {
          setResults([
            {
              toolId: "update",
              toolName: "stali-cli",
              success: true,
              message: res.message,
              configPath: res.installDir,
            },
          ]);
          setStep("done");
        } else {
          setError(res.error || res.message);
          setStep("menu");
        }
        break;
      }
      case "completion": {
        setLoading(true);
        setError(undefined);
        try {
          const { installAllCompletions } = await import("../services/completion-install");
          const rows = await installAllCompletions();
          setResults(
            rows.map((r) => ({
              toolId: r.shell,
              toolName: `completion ${r.shell}`,
              success: true,
              message: r.message,
              configPath: r.path,
            }))
          );
          setSelectedModel("Shell completion");
          setStep("done");
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : String(e));
          setStep("menu");
        } finally {
          setLoading(false);
        }
        break;
      }
      case "change-key":
        setStep("token");
        break;
      case "open-keys": {
        const { openUrlInBrowser } = await import("../utils/open-url");
        const { STALI_DASHBOARD_KEYS_URL } = await import("../services/auth-cli");
        openUrlInBrowser(STALI_DASHBOARD_KEYS_URL);
        setResults([
          {
            toolId: "open",
            toolName: "Dashboard Keys",
            success: true,
            message: STALI_DASHBOARD_KEYS_URL,
            configPath: STALI_DASHBOARD_KEYS_URL,
          },
        ]);
        setSelectedModel("Mở Dashboard");
        setStep("done");
        break;
      }
      case "exit":
        exit();
        break;
    }
  };

  const handleDoctorFix = async () => {
    setLoading(true);
    setError(undefined);
    const fixRes = await runDoctorFix({ apiKey });
    setResults(
      fixRes.items.map((item) => ({
        toolId: item.toolId || "fix",
        toolName: item.toolName || "Doctor fix",
        success: item.success,
        message: item.message,
        configPath: item.configPath,
        backupPath: item.backupPath,
        error: item.error,
      }))
    );
    setSelectedModel("Doctor fix");
    setLoading(false);
    setStep("done");
  };

  const handleConfigureAllSelect = async (action: ConfigureAllAction) => {
    if (action === "back") {
      setStep("menu");
      return;
    }
    setLoading(true);
    setError(undefined);
    const skipAdvanced = action !== "batch-13";
    const dryRun = action === "dry-run-11";
    const plugins = await loadPlugins();
    const includePlugins = plugins.length > 0;
    const batch = await runConfigureBatch({
      apiKey,
      skipAdvanced,
      dryRun,
      continueOnError: true,
      includePlugins,
    });
    setResults(
      batch.items.map((item) => ({
        toolId: item.toolId || "batch",
        toolName: item.toolName || "Configure-all",
        success: item.success,
        message: item.message,
        configPath: item.configPath,
        backupPath: item.backupPath,
        error: item.error,
      }))
    );
    setSelectedModel(
      dryRun
        ? "Configure-all (dry-run)"
        : includePlugins
        ? "Configure-all + plugins"
        : "Configure-all"
    );
    setLoading(false);
    setStep("done");
  };

  const handleInstallMenuSelect = async (action: InstallMenuAction) => {
    if (action === "back") {
      setStep("menu");
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      if (action === "check-update") {
        const { fetchLatestVersion } = await import("../services/version-check");
        const { resolveUpdateChannelResolved } = await import("../services/update-channel");
        const channelCfg = await resolveUpdateChannelResolved("stable");
        const ver = await fetchLatestVersion(channelCfg.versionUrl);
        setResults([
          {
            toolId: "install",
            toolName: "Version check",
            success: !ver.updateAvailable,
            message: ver.updateAvailable
              ? `Có bản mới: ${ver.latest} (hiện tại ${ver.current})`
              : `Đã là bản mới nhất (${ver.current})`,
            configPath: channelCfg.label,
          },
        ]);
        setSelectedModel("Kiểm tra phiên bản");
        setStep("done");
        return;
      }
      if (action === "npm-upgrade") {
        const { runInstallCli } = await import("../services/install-cli");
        const code = await runInstallCli({ npm: true });
        if (code !== 0) {
          setError("npm install -g thất bại — thử: stali install --json");
          setStep("install");
          return;
        }
        setResults([
          {
            toolId: "install",
            toolName: "npm global",
            success: true,
            message: "Đã nâng cấp qua npm. Mở terminal mới nếu PATH chưa cập nhật.",
            configPath: "npm install -g stali-cli@latest",
          },
        ]);
        setSelectedModel("Nâng cấp npm");
        setStep("done");
        return;
      }
      if (action === "auto-update") {
        const { installAutoUpdateCron } = await import("../services/auto-update");
        const r = await installAutoUpdateCron("stable");
        setResults([
          {
            toolId: "install",
            toolName: "auto-update",
            success: r.ok,
            message: r.message,
            configPath: "~/.stali/auto-update.log",
            error: r.error,
          },
        ]);
        setSelectedModel("Auto-update 04:00");
        setStep("done");
        return;
      }
      if (action === "guide") {
        const { buildInstallPlan } = await import("../services/install-cli");
        const plan = buildInstallPlan();
        const lines = plan.methods.map((m) => `${m.label}: ${m.command}`).join("\n");
        setResults([
          {
            toolId: "install",
            toolName: "Hướng dẫn",
            success: true,
            message: lines,
            configPath: "stali install",
          },
        ]);
        setSelectedModel("Hướng dẫn cài đặt");
        setStep("done");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("install");
    } finally {
      setLoading(false);
    }
  };

  const handlePluginsMenuSelect = async (action: PluginsMenuAction) => {
    if (action === "back") {
      setStep("menu");
      return;
    }
    if (action === "doctor") {
      setLoading(true);
      setDoctorReturnStep("plugins");
      await loadUnifiedDoctor();
      setLoading(false);
      setStep("doctor");
      return;
    }
    if (action === "sync") {
      setLoading(true);
      setError(undefined);
      const syncRes = await runPluginsSync({ apiKey });
      setResults(
        syncRes.items.map((item) => ({
          toolId: item.pluginId || "plugin",
          toolName: item.pluginName || "Plugin",
          success: item.success,
          message: item.message,
          configPath: item.configPath,
          backupPath: item.backupPath,
          error: item.error,
        }))
      );
      setSelectedModel("Plugins sync");
      setLoading(false);
      setStep("done");
    }
  };

  const handlePluginsSyncAll = async () => {
    setLoading(true);
    const syncRes = await runPluginsSync({ apiKey });
    setResults(
      syncRes.items.map((item) => ({
        toolId: item.pluginId || "plugin",
        toolName: item.pluginName || "Plugin",
        success: item.success,
        message: item.message,
        configPath: item.configPath,
        backupPath: item.backupPath,
        error: item.error,
      }))
    );
    setSelectedModel("Plugins sync");
    setLoading(false);
    setStep("done");
  };

  const handlePriceContinue = () => {
    setStep("menu");
  };

  const handleAppSelect = async (toolId: string) => {
    if (toolId === "back") {
      setStep("menu");
      return;
    }

    setSelectedTool(toolId);
    const defaultModel = resolveToolDefaultModel(toolId, apiDefaultModel, models);
    setGenericModel(defaultModel);

    if (toolId === "claude") {
      const s = await getClaudeStatus();
      setClaudeDraft({
        fable: s.fableModel || defaultModel,
        opus: s.opusModel || defaultModel,
        sonnet: s.sonnetModel || "claude-sonnet-5",
        haiku: s.haikuModel || "claude-haiku-4-5",
        context: s.maxContextTokens || "",
      });
    } else if (toolId === "codex") {
      const s = await getCodexStatus();
      setCodexDraft({
        model: s.model || defaultModel,
        subagentModel: s.subagentModel || "",
      });
    }

    setStep("tool-detail");
  };

  const handleToolAction = async (action: ToolMenuAction) => {
    if (action === "back") {
      setStep("app");
      return;
    }

    if (isGenericFlowTool(selectedTool)) {
      if (action === "reset") {
        setLoading(true);
        const res = await resetTool(selectedTool);
        setResults([res]);
        setSelectedModel("Default");
        setLoading(false);
        setStep("done");
        return;
      }
      if (action === "apply") {
        setStep("review");
        return;
      }
      if (action === "quick-setup") {
        const defaultModel = resolveToolDefaultModel(selectedTool, apiDefaultModel, models);
        setGenericModel(defaultModel);
        setStep("review");
        return;
      }
      if (action === "set-model") {
        setSelectedTier("all");
        setStep("model");
        return;
      }
      if (typeof action === "string" && action.startsWith("use-model:")) {
        setGenericModel(action.slice("use-model:".length));
        setStep("tool-detail");
        return;
      }
      return;
    }

    if (action === "reset") {
      setLoading(true);
      let res: SyncerResult;
      if (selectedTool === "claude") {
        res = await resetClaudeSettings();
      } else {
        res = await resetCodexSettings();
      }
      setResults([res]);
      setSelectedModel("Default");
      setLoading(false);
      setStep("done");
      return;
    }

    if (action === "apply") {
      setStep("review");
      return;
    }

    if (action === "set-context") {
      setStep("context");
      return;
    }

    if (action === "set-model") {
      setSelectedTier("all");
      setStep("model");
      return;
    }

    if (action === "set-subagent") {
      setSelectedTier("haiku");
      setStep("model");
      return;
    }

    if (action === "quick-setup") {
      setSelectedTier("all");
    } else if (action === "set-fable") {
      setSelectedTier("fable");
    } else if (action === "set-opus") {
      setSelectedTier("opus");
    } else if (action === "set-sonnet") {
      setSelectedTier("sonnet");
    } else if (action === "set-haiku") {
      setSelectedTier("haiku");
    } else {
      setSelectedTier("all");
    }
    setStep("model");
  };

  const handleConfirmApply = async () => {
    setLoading(true);
    let res: SyncerResult;

    if (selectedTool === "claude") {
      res = await saveClaudeFullSettings(apiKey, {
        fableModel: claudeDraft.fable,
        opusModel: claudeDraft.opus,
        sonnetModel: claudeDraft.sonnet,
        haikuModel: claudeDraft.haiku,
        maxContextTokens: claudeDraft.context,
      });
      setSelectedModel(
        `${claudeDraft.fable} (Fable) / ${claudeDraft.sonnet} (Sonnet)`
      );
    } else if (selectedTool === "codex") {
      res = await patchCodexSettings(
        apiKey,
        codexDraft.model || "req/gpt-5.6-sol",
        codexDraft.subagentModel
      );
      setSelectedModel(codexDraft.model || "req/gpt-5.6-sol");
    } else {
      res = await syncTool(selectedTool, apiKey, genericModel);
      setSelectedModel(genericModel);
    }

    await saveStaliConfig({
      currentModel:
        selectedTool === "claude"
          ? claudeDraft.fable
          : selectedTool === "codex"
          ? codexDraft.model
          : genericModel,
      configuredApps: {
        [selectedTool]: {
          configured: res.success,
          model:
            selectedTool === "claude"
              ? claudeDraft.fable
              : selectedTool === "codex"
              ? codexDraft.model
              : genericModel,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    setResults([res]);
    setLoading(false);
    setStep("done");
  };

  const handleContextSelect = (contextValue: string) => {
    if (contextValue === "back") {
      setStep("tool-detail");
      return;
    }
    if (contextValue === "__MANUAL_CONTEXT__") {
      setStep("manual-context");
      return;
    }
    setClaudeDraft((prev) => ({ ...prev, context: contextValue }));
    setStep("tool-detail");
  };

  const handleManualContextSubmit = (customTokens: string) => {
    setClaudeDraft((prev) => ({ ...prev, context: customTokens }));
    setStep("tool-detail");
  };

  const handleManualModelSubmit = (customModel: string) => {
    if (isGenericFlowTool(selectedTool)) {
      setGenericModel(customModel);
      setStep("tool-detail");
      return;
    }

    if (selectedTool === "claude") {
      if (selectedTier === "all") {
        setClaudeDraft((prev) => ({
          ...prev,
          fable: customModel,
          opus: customModel,
          sonnet: customModel,
          haiku: customModel,
        }));
      } else if (selectedTier === "fable") {
        setClaudeDraft((prev) => ({ ...prev, fable: customModel }));
      } else if (selectedTier === "opus") {
        setClaudeDraft((prev) => ({ ...prev, opus: customModel }));
      } else if (selectedTier === "sonnet") {
        setClaudeDraft((prev) => ({ ...prev, sonnet: customModel }));
      } else if (selectedTier === "haiku") {
        setClaudeDraft((prev) => ({ ...prev, haiku: customModel }));
      }
    } else if (selectedTool === "codex") {
      if (selectedTier === "all") {
        setCodexDraft((prev) => ({
          ...prev,
          model: customModel,
          subagentModel: customModel,
        }));
      } else if (selectedTier === "haiku") {
        setCodexDraft((prev) => ({ ...prev, subagentModel: customModel }));
      } else {
        setCodexDraft((prev) => ({ ...prev, model: customModel }));
      }
    }
    setStep("tool-detail");
  };

  const handleModelSelect = async (modelId: string) => {
    if (modelId === "back") {
      setStep("tool-detail");
      return;
    }
    if (modelId === "__MANUAL_INPUT__") {
      setStep("manual-model");
      return;
    }

    if (isGenericFlowTool(selectedTool)) {
      setGenericModel(modelId);
      setStep("tool-detail");
      return;
    }

    if (selectedTool === "claude") {
      if (selectedTier === "all") {
        setClaudeDraft((prev) => ({
          ...prev,
          fable: modelId,
          opus: modelId,
          sonnet: modelId,
          haiku: modelId,
        }));
      } else if (selectedTier === "fable") {
        setClaudeDraft((prev) => ({ ...prev, fable: modelId }));
      } else if (selectedTier === "opus") {
        setClaudeDraft((prev) => ({ ...prev, opus: modelId }));
      } else if (selectedTier === "sonnet") {
        setClaudeDraft((prev) => ({ ...prev, sonnet: modelId }));
      } else if (selectedTier === "haiku") {
        setClaudeDraft((prev) => ({ ...prev, haiku: modelId }));
      }
      setStep("tool-detail");
      return;
    }

    if (selectedTool === "codex") {
      if (selectedTier === "all") {
        setCodexDraft((prev) => ({
          ...prev,
          model: modelId,
          subagentModel: modelId,
        }));
      } else if (selectedTier === "haiku") {
        setCodexDraft((prev) => ({ ...prev, subagentModel: modelId }));
      } else {
        setCodexDraft((prev) => ({ ...prev, model: modelId }));
      }
      setStep("tool-detail");
    }
  };

  const getPreviewJson = () => {
    if (selectedTool === "claude") {
      const maskedToken = apiKey
        ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`
        : "sk-stali-...";
      const env: Record<string, string> = {
        ANTHROPIC_BASE_URL: "https://api.stali.vn",
        ANTHROPIC_AUTH_TOKEN: maskedToken,
        API_TIMEOUT_MS: "600000",
      };
      if (claudeDraft.fable) env.ANTHROPIC_MODEL = claudeDraft.fable;
      if (claudeDraft.opus) env.ANTHROPIC_DEFAULT_OPUS_MODEL = claudeDraft.opus;
      if (claudeDraft.sonnet) env.ANTHROPIC_DEFAULT_SONNET_MODEL = claudeDraft.sonnet;
      if (claudeDraft.haiku) env.ANTHROPIC_DEFAULT_HAIKU_MODEL = claudeDraft.haiku;
      if (claudeDraft.context) env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = claudeDraft.context;
      return { hasCompletedOnboarding: true, env };
    }

    if (selectedTool === "codex") {
      return {
        model: codexDraft.model || "req/gpt-5.6-sol",
        model_provider: "stali",
        model_providers: {
          stali: {
            name: "Stali API",
            base_url: "https://api.stali.vn/v1",
            wire_api: "responses",
          },
        },
        agents: {
          subagent: {
            model: codexDraft.subagentModel || codexDraft.model || "req/gpt-5.6-sol",
          },
        },
      };
    }

    const tool = getToolById(selectedTool);
    return buildToolConfigPreview(selectedTool, apiKey, genericModel);
  };

  const getReviewMeta = () => {
    const tool = getToolById(selectedTool);
    if (selectedTool === "claude") {
      return { name: "Claude Code", path: "~/.claude/settings.json" };
    }
    if (selectedTool === "codex") {
      return { name: "OpenAI Codex CLI", path: "~/.codex/config.toml" };
    }
    return {
      name: tool?.name || selectedTool,
      path: tool?.configFile || "~/.stali/config.json",
    };
  };

  const reviewMeta = getReviewMeta();

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header />

      {step === "token" && (
        <TokenInput
          existingToken={apiKey}
          loading={loading}
          error={error}
          onSubmit={handleTokenSubmit}
        />
      )}

      {step === "menu" && (
        <MainMenu apiKey={apiKey} installMode={installModeLabel} onSelect={handleMenuSelect} />
      )}

      {step === "pricing" && (
        <PriceTable models={models} onContinue={handlePriceContinue} />
      )}

      {step === "doctor" && (
        <DoctorView
          toolStatuses={doctorStatuses}
          pluginStatuses={pluginStatuses}
          onBack={() => setStep(doctorReturnStep)}
          onFixAllTools={handleDoctorFix}
          onSyncAllPlugins={handlePluginsSyncAll}
          backLabel={
            doctorReturnStep === "plugins"
              ? "⬅️  Quay lại Menu Plugin"
              : "⬅️  Quay lại Menu chính"
          }
        />
      )}

      {step === "configure-all" && (
        <ConfigureAllMenu pluginCount={pluginCount} onSelect={handleConfigureAllSelect} />
      )}

      {step === "install" && (
        <InstallMenu installMode={installModeLabel} onSelect={handleInstallMenuSelect} />
      )}

      {step === "plugins" && (
        <PluginsMenu pluginCount={pluginCount} onSelect={handlePluginsMenuSelect} />
      )}

      {step === "app" && <AppSelect onSelect={handleAppSelect} />}

      {step === "tool-detail" && (
        <ToolDetailMenu
          toolId={selectedTool}
          apiKey={apiKey}
          genericModel={genericModel}
          claudeDraft={claudeDraft}
          codexDraft={codexDraft}
          onClaudeDraftChange={setClaudeDraft}
          onCodexDraftChange={setCodexDraft}
          onSelectAction={handleToolAction}
        />
      )}

      {step === "context" && (
        <ContextSelect
          currentContext={claudeDraft.context}
          onSelect={handleContextSelect}
        />
      )}

      {step === "manual-context" && (
        <ManualInput
          title="✍️ NHẬP SỐ TOKEN CONTEXT WINDOW THỦ CÔNG"
          subtitle="Nhập số token tối đa cho CLAUDE_CODE_MAX_CONTEXT_TOKENS (ví dụ: 998000, 498000, 198000...)"
          placeholder="Nhập số tokens (ví dụ: 998000)..."
          defaultValue={claudeDraft.context}
          onSubmit={handleManualContextSubmit}
          onCancel={() => setStep("context")}
        />
      )}

      {step === "model" && (
        <ModelSelect
          toolId={selectedTool}
          tier={selectedTier}
          models={models}
          onSelect={handleModelSelect}
        />
      )}

      {step === "manual-model" && (
        <ManualInput
          title={`✍️ NHẬP MÃ MODEL THỦ CÔNG (${
            selectedTool === "codex"
              ? selectedTier === "haiku"
                ? "SUBAGENT MODEL"
                : "MAIN MODEL"
              : isGenericFlowTool(selectedTool)
              ? "MODEL"
              : selectedTier.toUpperCase()
          })`}
          subtitle="Nhập tên hoặc mã model tùy chỉnh (ví dụ: req/gpt-5.6-sol, claude-fable-5, ...)"
          placeholder="Nhập mã model..."
          defaultValue={
            isGenericFlowTool(selectedTool)
              ? genericModel
              : selectedTool === "codex"
              ? selectedTier === "haiku"
                ? codexDraft.subagentModel
                : codexDraft.model
              : selectedTier === "sonnet"
              ? claudeDraft.sonnet
              : selectedTier === "opus"
              ? claudeDraft.opus
              : selectedTier === "haiku"
              ? claudeDraft.haiku
              : claudeDraft.fable
          }
          onSubmit={handleManualModelSubmit}
          onCancel={() => setStep("model")}
        />
      )}

      {step === "review" && (
        <ConfigReview
          toolName={reviewMeta.name}
          filePath={reviewMeta.path}
          configJson={getPreviewJson()}
          onConfirm={handleConfirmApply}
          onCancel={() => setStep("tool-detail")}
        />
      )}

      {step === "done" && (
        <SetupDone
          results={results}
          model={selectedModel}
          onMenu={() => setStep("menu")}
          onExit={() => exit()}
        />
      )}
    </Box>
  );
};
