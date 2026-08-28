/**
 * Lazy-load Ink/React wizard — giữ cold-start của subcommand CLI nhẹ hơn.
 */
export async function launchWizard(initialKey?: string): Promise<void> {
  const [{ default: React }, { render }, { Wizard }] = await Promise.all([
    import("react"),
    import("ink"),
    import("../ui/Wizard"),
  ]);
  render(React.createElement(Wizard, { initialKey }));
}
