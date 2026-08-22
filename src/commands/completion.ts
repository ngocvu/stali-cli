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
  "doctor",
  "update",
  "configure",
  "configure-all",
  "export-env",
  "restore",
  "completion",
  "ls",
];

const GLOBAL_FLAGS = ["-k", "--key", "-V", "--version", "-h", "--help", "--models", "--reset"];

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
];
const RESTORE_FLAGS = ["-t", "--tool", "-b", "--backup"];
const DOCTOR_FLAGS = ["--json", "--fix", "--dry-run", "--force", "--tools"];

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
  return `#compdef stali
# stali zsh completion — thêm vào ~/.zshrc:
#   eval "$(stali completion zsh)"

_stali() {
  local -a subcmds flags configure_tools
  subcmds=(
    'paths:Hiển thị ~/.stali'
    'tools:Liệt kê 13 công cụ'
    'doctor:Kiểm tra cấu hình Stali'
    'update:Cập nhật CLI'
    'configure:Cấu hình một tool'
    'configure-all:Cấu hình hàng loạt'
    'restore:Khôi phục backup'
    'completion:Shell completion'
    'ls:Bảng giá model'
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
            '--skip-advanced[Bỏ qua claude/codex]'
          ;;
        restore)
          _arguments \\
            '(-t --tool)'{-t,--tool}'[Tool ID]:tool:($configure_tools)' \\
            '(-b --backup)'{-b,--backup}'[Đường dẫn backup]'
          ;;
        doctor)
          _arguments '--json[Xuất JSON]'
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
    "",
    "complete -c stali -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish'",
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
