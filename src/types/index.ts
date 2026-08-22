import { z } from "zod";

// Pricing schemas
export const StaliPricingTokenSchema = z.object({
  currency: z.literal("VND"),
  input_per_1m: z.number(),
  output_per_1m: z.number(),
  min_per_request: z.number().optional(),
});

export const StaliPricingRequestSchema = z.object({
  currency: z.literal("VND"),
  per_request: z.number(),
});

export const StaliPricingSchema = z.union([
  StaliPricingTokenSchema,
  StaliPricingRequestSchema,
]);

// Model schema
export const StaliModelSchema = z.object({
  id: z.string(),
  object: z.literal("model").optional(),
  type: z.string().optional(),
  created: z.number().optional(),
  created_at: z.string().optional(),
  owned_by: z.string().optional(),
  display_name: z.string(),
  context_window: z.number().optional(),
  max_output_tokens: z.number().optional(),
  supported_endpoint_types: z.array(z.enum(["anthropic", "openai"])),
  billing_unit: z.enum(["token", "request"]),
  pricing: StaliPricingSchema,
});

// API response schema
export const StaliModelsResponseSchema = z.object({
  object: z.literal("list").optional(),
  data: z.array(StaliModelSchema),
  default_model: z.string().optional(),
});

// Config file schema (~/.stali/config.json)
export const StaliConfigFileSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().default("https://api.stali.vn/v1"),
  currentModel: z.string().optional(),
  configuredApps: z
    .record(
      z.string(),
      z.object({
        configured: z.boolean(),
        model: z.string().optional(),
        updatedAt: z.string().optional(),
      })
    )
    .optional(),
  lastUpdated: z.string().optional(),
});

// Types inferred from schemas
export type StaliPricingToken = z.infer<typeof StaliPricingTokenSchema>;
export type StaliPricingRequest = z.infer<typeof StaliPricingRequestSchema>;
export type StaliPricing = z.infer<typeof StaliPricingSchema>;
export type StaliModel = z.infer<typeof StaliModelSchema>;
export type StaliModelsResponse = z.infer<typeof StaliModelsResponseSchema>;
export type StaliConfigFile = z.infer<typeof StaliConfigFileSchema>;

// Tool Definition & Syncer Result
export type ToolProtocol = "anthropic" | "openai" | "both";

export interface ToolDefinition {
  id: string;
  name: string;
  command: string;
  protocol: ToolProtocol;
  description: string;
  configFile: string;
  color: string;
  icon: string;
  defaultModel: string;
}

export interface SyncerResult {
  toolId: string;
  toolName: string;
  success: boolean;
  message: string;
  configPath?: string;
  backupPath?: string;
  error?: string;
}
