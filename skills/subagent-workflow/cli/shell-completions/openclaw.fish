# Fish completion for openclaw subagent commands

# grill command
complete -c openclaw -n "__fish_use_subcommand" -a grill -d "Pre-PR code review with critic subagent"
complete -c openclaw -n "__fish_seen_subcommand_from grill" -s s -l strict -d "Fail on CONSIDER items"
complete -c openclaw -n "__fish_seen_subcommand_from grill" -s f -l focus -d "Focus area" -a "security performance api"
complete -c openclaw -n "__fish_seen_subcommand_from grill" -s q -l quick -d "Quick review - critical issues only"
complete -c openclaw -n "__fish_seen_subcommand_from grill" -a "(git branch --format='%(refname:short)' 2>/dev/null)" -d "Git branch"

# subagents command
complete -c openclaw -n "__fish_use_subcommand" -a subagents -d "Parallelize task across worker subagents"
complete -c openclaw -n "__fish_seen_subcommand_from subagents" -s n -l count -d "Number of workers" -a "2 4 8 16"
complete -c openclaw -n "__fish_seen_subcommand_from subagents" -l labels -d "Custom worker labels (comma-separated)"

# guard command
complete -c openclaw -n "__fish_use_subcommand" -a guard -d "Opus Guard security controls"
complete -c openclaw -n "__fish_seen_subcommand_from guard" -a status -d "Show opus-guard security log"
complete -c openclaw -n "__fish_seen_subcommand_from guard; and __fish_seen_subcommand_from status" -l tail -d "Show last N decisions" -a "10 20 50 100"

# Helper function to check if we're using a subcommand
function __fish_use_subcommand
    set -l cmd (commandline -opc)
    if [ (count $cmd) -eq 1 ]
        return 0
    end
    return 1
end

# Suggestions for focus areas
complete -c openclaw -n "__fish_seen_subcommand_from grill; and __fish_seen_argument -s f -l focus" -a "security" -d "Focus on security vulnerabilities"
complete -c openclaw -n "__fish_seen_subcommand_from grill; and __fish_seen_argument -s f -l focus" -a "performance" -d "Focus on performance issues"
complete -c openclaw -n "__fish_seen_subcommand_from grill; and __fish_seen_argument -s f -l focus" -a "api" -d "Focus on API design"
