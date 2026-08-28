import { SUPPORTED_TOOLS } from "../constants/tools";

const TOOL_IDS = SUPPORTED_TOOLS.map((t) => t.id);
const TOOL_ALIASES = [
  "claude-code",
  "deepseek",
  "vscode-cline",
  "grok-build",
  "kilo-code",
  "roo-code",
];

const SUBCOMMANDS = [
  "paths",
  "tools",
  "init",
  "plugins",
  "config",
  "check",
  "backups",
  "info",
  "doctor",
  "update",
  "gateway",
  "gw",
  "install",
  "bench",
  "telemetry",
  "configure",
  "configure-all",
  "export-env",
  "uninstall",
  "auth",
  "open",
  "guide",
  "restore",
  "completion",
  "ls",
  "wizard",
];

const GLOBAL_FLAGS = ["-k", "--key", "-V", "--version", "-h", "--help", "--models", "--reset", "--lang"];
const CHECK_FLAGS = ["--strict", "--tools-only", "--plugins-only", "--json"];

const CONFIGURE_FLAGS = ["-m", "--model", "--dry-run", "-k", "--key"];
const CONFIGURE_ALL_FLAGS = [
  "-m",
  "--model",
  "--dry-run",
  "-k",
  "--key",
  "--tools",
  "--continue-on-error",
  "--skip-advanced",
  "--include-plugins",
  "--no-plugins",
];
const RESTORE_FLAGS = ["-t", "--tool", "-b", "--backup"];
const DOCTOR_FLAGS = ["--json", "--plugins-only", "--tools-only", "--fix", "--dry-run", "--force", "--tools", "--ids", "--watch", "--notify", "-i", "--interval"];
const GATEWAY_ACTIONS = ["auto", "scan", "plan", "install"];
const GATEWAY_FLAGS = ["--json", "--dry-run", "--all", "--force", "-y", "--yes", "-m", "--model", "--continue-on-error", "--include-plugins", "--no-plugins"];
const INFO_FLAGS = ["--json", "--offline", "--online"];
const BENCH_FLAGS = ["--json", "--strict", "--runs"];
const TELEMETRY_SUB = ["status", "on", "off"];
const CONFIG_SET_FLAGS = ["base-url", "--reset"];
const PLUGINS_SUB = ["list", "sync", "--init"];
const PLUGINS_SYNC_FLAGS = ["-k", "--key", "-m", "--model", "--dry-run", "--ids"];

function bashCompletion(): string {
  const tools = [...TOOL_IDS, ...TOOL_ALIASES].join(" ");
  return `# stali bash completion — thêm vào ~/.bashrc:
#   eval "$(stali completion bash)"
_stali_completion() {
  local cur prev words cword
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  if [[ "\${COMP_CWORD}" -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${SUBCOMMANDS.join(" ")} ${GLOBAL_FLAGS.filter((f) => !f.startsWith("--")).join(" ")}" -- "\${cur}") )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    configure)
      if [[ "\${prev}" == "configure" ]]; then
        COMPREPLY=( $(compgen -W "${tools}" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "${CONFIGURE_FLAGS.join(" ")}" -- "\${cur}") )
      fi
      ;;
    configure-all)
      COMPREPLY=( $(compgen -W "${CONFIGURE_ALL_FLAGS.join(" ")}" -- "\${cur}") )
      ;;
    restore)
      if [[ "\${prev}" == "restore" || "\${prev}" == "-t" || "\${prev}" == "--tool" ]]; then
        COMPREPLY=( $(compgen -W "${tools}" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "${RESTORE_FLAGS.join(" ")}" -- "\${cur}") )
      fi
      ;;
    doctor)
      COMPREPLY=( $(compgen -W "${DOCTOR_FLAGS.join(" ")}" -- "\${cur}") )
      ;;
    check)
      COMPREPLY=( $(compgen -W "${CHECK_FLAGS.join(" ")}" -- "\${cur}") )
      ;;
    gateway|gw)
      if [[ "\${prev}" == "gateway" || "\${prev}" == "gw" ]]; then
        COMPREPLY=( $(compgen -W "${GATEWAY_ACTIONS.join(" ")}" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "${GATEWAY_FLAGS.join(" ")}" -- "\${cur}") )
      fi
      ;;
    info)
      COMPREPLY=( $(compgen -W "${INFO_FLAGS.join(" ")}" -- "\${cur}") )
      ;;
    bench)
      COMPREPLY=( $(compgen -W "${BENCH_FLAGS.join(" ")}" -- "\${cur}") )
      ;;
    telemetry)
      if [[ "\${prev}" == "telemetry" ]]; then
        COMPREPLY=( $(compgen -W "${TELEMETRY_SUB.join(" ")}" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "--json" -- "\${cur}") )
      fi
      ;;
    config)
      if [[ "\${prev}" == "config" ]]; then
        COMPREPLY=( $(compgen -W "show set" -- "\${cur}") )
      elif [[ "\${COMP_WORDS[2]}" == "set" && "\${prev}" == "set" ]]; then
        COMPREPLY=( $(compgen -W "base-url" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "--json --reset" -- "\${cur}") )
      fi
      ;;
    plugins)
      if [[ "\${prev}" == "plugins" ]]; then
        COMPREPLY=( $(compgen -W "${PLUGINS_SUB.join(" ")}" -- "\${cur}") )
      elif [[ "\${COMP_WORDS[2]}" == "sync" ]]; then
        COMPREPLY=( $(compgen -W "${PLUGINS_SYNC_FLAGS.join(" ")}" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "--init" -- "\${cur}") )
      fi
      ;;
    export-env)
      if [[ "\${prev}" == "export-env" ]]; then
        COMPREPLY=( $(compgen -W "${tools}" -- "\${cur}") )
      else
        COMPREPLY=( $(compgen -W "-m --model -f --format" -- "\${cur}") )
      fi
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      ;;
    *)
      COMPREPLY=( $(compgen -W "${GLOBAL_FLAGS.join(" ")}" -- "\${cur}") )
      ;;
  esac
}
complete -F _stali_completion stali
`;
}

function zshCompletion(): string {
  const tools = [...TOOL_IDS, ...TOOL_ALIASES];
  const subcmdLines = SUBCOMMANDS.map((s) => `    '${s}'`).join("\n");
  return `#compdef stali
# stali zsh completion — thêm vào ~/.zshrc:
#   eval "$(stali completion zsh)"

_stali() {
  local -a subcmds flags configure_tools
  subcmds=(
${subcmdLines}
  )
  configure_tools=(
${tools.map((t) => `    '${t}'`).join("\n")}
  )

  _arguments -C \\
    '(-k --key)'{-k,--key}'[API key Stali]' \\
    '--models[Bảng giá model]' \\
    '--reset[Xóa token ~/.stali]' \\
    '1: :->cmd' \\
    '*::arg:->args'

  case $state in
    cmd)
      _describe 'stali command' subcmds
      ;;
    args)
      case $words[1] in
        configure)
          _arguments \\
            '(-m --model)'{-m,--model}'[Model]' \\
            '--dry-run[Preview không ghi file]' \\
            '1:tool:($configure_tools)'
          ;;
        configure-all)
          _arguments \\
            '(-m --model)'{-m,--model}'[Model]' \\
            '--dry-run[Preview]' \\
            '--tools[Danh sách tool, cách nhau bởi dấu phẩy]' \\
            '--continue-on-error[Tiếp tục khi lỗi]' \\
            '--skip-advanced[Bỏ qua claude/codex]' \\
            '--include-plugins[Đồng bộ plugin sau configure]' \\
            '--no-plugins[Bỏ qua plugin]'
          ;;
        restore)
          _arguments \\
            '(-t --tool)'{-t,--tool}'[Tool ID]:tool:($configure_tools)' \\
            '(-b --backup)'{-b,--backup}'[Đường dẫn backup]'
          ;;
        check)
          _arguments \\
            '--strict[Yêu cầu tất cả tool/plugin OK]' \\
            '--tools-only[Chỉ 13 tool]' \\
            '--plugins-only[Chỉ plugin]' \\
            '--json[Xuất JSON]'
          ;;
        doctor)
          _arguments \\
            '--json[Xuất JSON]' \\
            '--plugins-only[Chỉ plugin]' \\
            '--tools-only[Chỉ tool]' \\
            '--fix[Tự sửa cấu hình]' \\
            '--watch[Theo dõi liên tục]' \\
            '--notify[Desktop notify với --watch]' \\
            '(-i --interval)'{-i,--interval}'[Chu kỳ giây]'
          ;;
        init)
          _arguments \\
            '(-k --key)'{-k,--key}'[API key]' \\
            '--skip-configure[Bỏ configure-all]' \\
            '--include-plugins[Đồng bộ plugin]' \\
            '--no-plugins[Bỏ plugin]'
          ;;
        wizard)
          _arguments '(-k --key)'{-k,--key}'[API key khởi tạo wizard]'
          ;;
        gateway|gw)
          _arguments \\
            '1:action:(scan plan auto install)' \\
            '--json[JSON output]' \\
            '--dry-run[Preview install]' \\
            '--all[Cả 13 tool]' \\
            '--force[Ghi đè đã gateway]' \\
            '(-y --yes)'{-y,--yes}'[Chạy ngay, không banner — mặc định action=auto khi có key]' \\
            '(-m --model)'{-m,--model}'[Model]'
          ;;
        info)
          _arguments \\
            '--json[JSON]' \\
            '--offline[Không gọi mạng]' \\
            '--online[Validate auth + npm]'
          ;;
        bench)
          _arguments \\
            '--json[JSON]' \\
            '--strict[Fail nếu vượt ngưỡng]' \\
            '--runs[Số lần chạy]'
          ;;
        telemetry)
          _arguments '1:sub:(status on off)' '--json[JSON với status]'
          ;;
        completion)
          _arguments '1:shell:(bash zsh fish)'
          ;;
      esac
      ;;
  esac
}

_stali "$@"
`;
}

function fishCompletion(): string {
  const tools = [...TOOL_IDS, ...TOOL_ALIASES];
  const lines = [
    "# stali fish completion — lưu vào ~/.config/fish/completions/stali.fish",
    "# hoặc: stali completion fish > ~/.config/fish/completions/stali.fish",
    "",
    "complete -c stali -f",
    ...SUBCOMMANDS.map(
      (s) => `complete -c stali -n '__fish_use_subcommand' -a '${s}'`
    ),
    ...GLOBAL_FLAGS.map((f) => {
      const desc =
        f === "-k" || f === "--key"
          ? "API key"
          : f === "--models"
          ? "Bảng giá"
          : f === "--reset"
          ? "Xóa token"
          : "";
      return `complete -c stali -s ${f.replace(/^-+/, "")} -l ${f.replace(/^-+/, "")} -d '${desc}'`;
    }),
    "",
    "complete -c stali -n '__fish_seen_subcommand_from configure' -a '" +
      tools.join(" ") +
      "'",
    "complete -c stali -n '__fish_seen_subcommand_from configure' -s m -l model -d 'Model'",
    "complete -c stali -n '__fish_seen_subcommand_from configure' -l dry-run",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from configure-all' -s m -l model",
    "complete -c stali -n '__fish_seen_subcommand_from configure-all' -l dry-run",
    "complete -c stali -n '__fish_seen_subcommand_from configure-all' -l tools",
    "complete -c stali -n '__fish_seen_subcommand_from configure-all' -l continue-on-error",
    "complete -c stali -n '__fish_seen_subcommand_from configure-all' -l skip-advanced",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from restore' -s t -l tool -a '" +
      tools.join(" ") +
      "'",
    "complete -c stali -n '__fish_seen_subcommand_from restore' -s b -l backup",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l json",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l plugins-only",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l tools-only",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l watch",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l notify",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l prometheus -d 'Metrics Prometheus text'",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l metrics-port -d 'HTTP /metrics (với --watch)'",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l max-cycles -d 'Số lần quét (CI)'",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -l duration -d 'Giới hạn giây (CI)'",
    "complete -c stali -n '__fish_seen_subcommand_from doctor' -s i -l interval",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from check' -l strict",
    "complete -c stali -n '__fish_seen_subcommand_from check' -l tools-only",
    "complete -c stali -n '__fish_seen_subcommand_from check' -l plugins-only",
    "complete -c stali -n '__fish_seen_subcommand_from check' -l json",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from init' -s k -l key",
    "complete -c stali -n '__fish_seen_subcommand_from init' -l skip-configure",
    "complete -c stali -n '__fish_seen_subcommand_from init' -l include-plugins",
    "complete -c stali -n '__fish_seen_subcommand_from init' -l no-plugins",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from plugins' -l init",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from gateway' -a 'auto scan plan install'",
    "complete -c stali -n '__fish_seen_subcommand_from gw' -a 'auto scan plan install'",
    "complete -c stali -n '__fish_seen_subcommand_from gateway' -l json",
    "complete -c stali -n '__fish_seen_subcommand_from gateway' -l dry-run",
    "complete -c stali -n '__fish_seen_subcommand_from gateway' -l all",
    "complete -c stali -n '__fish_seen_subcommand_from gateway' -l force",
    "complete -c stali -n '__fish_seen_subcommand_from gateway' -s y -l yes -d 'Chạy ngay (mặc định auto khi có key)'",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from info' -l json",
    "complete -c stali -n '__fish_seen_subcommand_from info' -l offline",
    "complete -c stali -n '__fish_seen_subcommand_from info' -l online",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from bench' -l json",
    "complete -c stali -n '__fish_seen_subcommand_from bench' -l strict",
    "complete -c stali -n '__fish_seen_subcommand_from bench' -l runs",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from telemetry' -a 'status on off'",
    "complete -c stali -n '__fish_seen_subcommand_from telemetry' -l json",
    "",
    "complete -c stali -n '__fish_seen_subcommand_from completion' -l install -d 'Cài completion vào shell config'",
    "complete -c stali -n '__fish_seen_subcommand_from completion' -l all -d 'Cài bash+fish+zsh (với --install)'",
    "complete -c stali -n '__fish_seen_subcommand_from completion' -l uninstall -d 'Gỡ completion đã cài'",
    "complete -c stali -n '__fish_seen_subcommand_from completion' -l doctor -d 'Kiểm tra completion đã cài'",
    "complete -c stali -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish auto all'",
  ];
  return lines.join("\n") + "\n";
}

export function renderCompletion(shell: string): string | null {
  switch (shell.toLowerCase()) {
    case "bash":
      return bashCompletion();
    case "zsh":
      return zshCompletion();
    case "fish":
      return fishCompletion();
    default:
      return null;
  }
}
