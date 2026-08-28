import type { Command } from "commander";
import chalk from "chalk";
import { resetStaliConfig } from "../services/config";

/** Chỉ bundle wizard-cli — không import từ register.ts (tránh kéo React vào subcommand). */
export function attachWizardDefaultAction(program: Command): void {
  program.action(async (options: { reset?: boolean; logout?: boolean; models?: boolean; key?: string }) => {
    if (options.reset || options.logout) {
      await resetStaliConfig();
      console.log(chalk.green("✅ Đã xóa token đã lưu trong ~/.stali/config.json thành công."));
      process.exit(0);
    }

    if (options.models) {
      const { displayModelsTable } = await import("./models");
      await displayModelsTable(options.key);
      process.exit(0);
    }

    const { launchWizard } = await import("./wizard-launcher");
    await launchWizard(options.key);
  });
}
