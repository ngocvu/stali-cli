import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { getStaliHome } from "../constants/paths";

const PluginPatchStyleSchema = z.enum([
  "anthropic-env",
  "openai-toml",
  "openai-json",
  "vscode-agent",
  "opencode",
]);

const PluginEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  configFile: z.string().min(1),
  protocol: z.enum(["anthropic", "openai", "both"]).default("openai"),
  patchStyle: PluginPatchStyleSchema.optional(),
  defaultModel: z.string().optional(),
  description: z.string().optional(),
});

const PluginsFileSchema = z.object({
  customTools: z.array(PluginEntrySchema).default([]),
});

export type PluginEntry = z.infer<typeof PluginEntrySchema>;
export type PluginPatchStyle = z.infer<typeof PluginPatchStyleSchema>;

export function getPluginsPath(): string {
  return path.join(getStaliHome(), "plugins.json");
}

export async function loadPlugins(): Promise<PluginEntry[]> {
  const filePath = getPluginsPath();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = PluginsFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.customTools;
  } catch {
    return [];
  }
}

export async function writePluginsExample(): Promise<string> {
  const filePath = getPluginsPath();
  const example = {
    customTools: [
      {
        id: "my-agent",
        name: "My Custom Agent",
        configFile: "~/.my-agent/config.json",
        protocol: "openai",
        patchStyle: "openai-json",
        defaultModel: "gpt-5.6-sol",
        description: "Plugin mẫu — sync: stali plugins sync",
      },
    ],
  };
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    await fs.writeFile(filePath, JSON.stringify(example, null, 2) + "\n", "utf8");
    return filePath;
  }
}

export function getPluginById(id: string, plugins?: PluginEntry[]): PluginEntry | undefined {
  const list = plugins || [];
  return list.find((p) => p.id === id);
}
