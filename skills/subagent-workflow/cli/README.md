# Subagent Workflow CLI

CLI command registration and shell integrations for OpenClaw subagent skills.

## Overview

This package provides:
- **CLI commands**: `grill`, `subagents`, `guard` integrated with the OpenClaw CLI
- **Shell completions**: Bash, Zsh, and Fish completions with intelligent suggestions
- **Git hooks**: Pre-commit reviews and commit message enhancements
- **VS Code snippets**: Quick commands for spawning subagents

## Installation

### 1. CLI Commands

#### Option A: Import into your CLI entry point

```typescript
import { Command } from 'commander';
import { registerSubagentCommands } from './skills/subagent-workflow/cli/commands';

const program = new Command();

// ... other command registrations ...

// Register subagent workflow commands
registerSubagentCommands(program);

program.parse();
```

#### Option B: Standalone CLI (if not integrated into main CLI)

```bash
# Add to your shell profile
alias grill='npx tsx skills/subagent-workflow/cli/commands.ts'
```

### 2. Shell Completions

#### Bash

```bash
# Copy completion file
cp skills/subagent-workflow/cli/shell-completions/openclaw.bash ~/.bash_completions/openclaw

# Add to ~/.bashrc
echo 'source ~/.bash_completions/openclaw' >> ~/.bashrc

# Or use bash-completion directory
sudo cp skills/subagent-workflow/cli/shell-completions/openclaw.bash /etc/bash_completion.d/openclaw
```

#### Zsh

```bash
# Copy to completions directory
mkdir -p ~/.zsh/completions
cp skills/subagent-workflow/cli/shell-completions/openclaw.zsh ~/.zsh/completions/_openclaw

# Add to ~/.zshrc
echo 'fpath+=(~/.zsh/completions)' >> ~/.zshrc
echo 'autoload -U compinit && compinit' >> ~/.zshrc
```

#### Fish

```bash
# Copy to fish completions
cp skills/subagent-workflow/cli/shell-completions/openclaw.fish ~/.config/fish/completions/openclaw.fish
```

### 3. Git Hooks

#### Quick Setup

```bash
# From repository root
ln -sf ../../skills/subagent-workflow/cli/git-hooks/pre-commit .git/hooks/pre-commit
ln -sf ../../skills/subagent-workflow/cli/git-hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
```

#### Configuration

Environment variables to customize behavior:

```bash
# Disable pre-commit grill
export OPENCLAW_GRILL_PRECOMMIT=false

# Enable strict mode (fails on CONSIDER items)
export OPENCLAW_GRILL_STRICT=true

# Disable commit message suggestions
export OPENCLAW_SUGGEST_FIXES=false
```

Add these to your `~/.profile` or shell configuration file.

### 4. VS Code Snippets

#### Option A: Workspace Settings (Recommended)

```bash
# Create .vscode directory if needed
mkdir -p .vscode

# Link snippets
cp skills/subagent-workflow/cli/vscode-extension/snippets.json .vscode/openclaw.code-snippets
```

#### Option B: User Settings

```bash
# Copy to VS Code user snippets directory
# macOS:
cp skills/subagent-workflow/cli/vscode-extension/snippets.json \
  ~/Library/Application\ Support/Code/User/snippets/openclaw.json

# Linux:
cp skills/subagent-workflow/cli/vscode-extension/snippets.json \
  ~/.config/Code/User/snippets/openclaw.json

# Windows:
copy skills\subagent-workflow\cli\vscode-extension\snippets.json \
  %APPDATA%\Code\User\snippets\openclaw.json
```

## Commands

### `grill [branch]`

Pre-PR code review with critic subagent.

```bash
# Basic usage (review against main)
openclaw grill

# Review against specific branch
openclaw grill develop

# Strict mode - fail on CONSIDER items
openclaw grill --strict

# Focus on specific area
openclaw grill --focus security
openclaw grill --focus performance
openclaw grill --focus api

# Quick review
openclaw grill --quick
```

### `subagents <task>`

Parallelize a task across worker subagents.

```bash
# Spawn 4 workers (default)
openclaw subagents "Process these files"

# Custom worker count
openclaw subagents "Analyze code" --count 8

# Custom labels
openclaw subagents "Review docs" --labels "reviewer-a,reviewer-b,reviewer-c"
```

### `guard status`

Show Opus Guard security log.

```bash
# Show all entries
openclaw guard status

# Show last 20 entries
openclaw guard status --tail 20
```

## Snippets Reference

| Prefix | Description |
|--------|-------------|
| `spawn-review` | Spawn critic subagent for code review |
| `use-subagents` | Parallelize task across workers |
| `guard-check` | Check Opus Guard security log |
| `grill-quick` | Quick pre-PR grill review |
| `grill-strict` | Strict grill review |
| `spawn-workers` | Spawn worker pool |
| `grill-focus` | Grill with custom focus area |
| `agent-spawn` | Generic subagent spawn command |

## PATH Setup

Ensure the OpenClaw CLI is in your PATH:

```bash
# If using pnpm
export PATH="$HOME/.local/share/pnpm:$PATH"

# If using npm global
export PATH="$HOME/.npm-global/bin:$PATH"

# If using custom location
export PATH="/path/to/openclaw/bin:$PATH"
```

## Integration Example

### Complete workflow setup

```bash
# 1. Install completions (bash example)
mkdir -p ~/.bash_completions
cp skills/subagent-workflow/cli/shell-completions/openclaw.bash ~/.bash_completions/openclaw
source ~/.bash_completions/openclaw

# 2. Install git hooks
ln -sf ../../skills/subagent-workflow/cli/git-hooks/pre-commit .git/hooks/pre-commit
ln -sf ../../skills/subagent-workflow/cli/git-hooks/prepare-commit-msg .git/hooks/prepare-commit-msg

# 3. Set environment (optional)
export OPENCLAW_GRILL_PRECOMMIT=true
export OPENCLAW_GRILL_STRICT=false

# 4. Install VS Code snippets
cp skills/subagent-workflow/cli/vscode-extension/snippets.json .vscode/openclaw.code-snippets

# 5. Verify installation
openclaw grill --help
openclaw subagents --help
openclaw guard status --help
```

## File Structure

```
skills/subagent-workflow/cli/
├── commands.ts                 # Main CLI command implementations
├── README.md                   # This file
├── shell-completions/
│   ├── openclaw.bash          # Bash completions
│   ├── openclaw.zsh           # Zsh completions
│   └── openclaw.fish          # Fish completions
├── git-hooks/
│   ├── pre-commit             # Pre-commit grill hook
│   └── prepare-commit-msg     # Commit message suggestions hook
└── vscode-extension/
    ├── package.json           # VS Code extension manifest
    └── snippets.json          # Code snippets
```

## Troubleshooting

### Completions not working

1. Ensure the completion file is sourced (check with `type _openclaw`)
2. Reload your shell: `source ~/.bashrc` (or `~/.zshrc`)
3. Check shell version compatibility

### Git hooks not running

1. Verify symlinks: `ls -la .git/hooks/`
2. Make hooks executable: `chmod +x .git/hooks/pre-commit`
3. Check git config: `git config core.hooksPath`

### VS Code snippets not appearing

1. Open Command Palette → "Developer: Reload Window"
2. Check snippet file path: `.vscode/openclaw.code-snippets`
3. Verify JSON syntax in snippet file

## License

Part of OpenClaw. See repository LICENSE.
