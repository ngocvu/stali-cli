import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { getStaliHome } from "../constants/paths";

const PluginEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  configFile: z.string().min(1),
  protocol: z.enum(["anthropic", "openai", "both"]).default("openai"),
  description: z.string().optional(),
});

const PluginsFileSchema = z.object({
  customTools: z.array(PluginEntrySchema).default([]),
});

export type PluginEntry = z.infer<typeof PluginEntrySchema>;

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
        description: "Ví dụ plugin — chưa có syncer tự động",
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
