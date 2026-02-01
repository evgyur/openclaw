#compdef openclaw
# Zsh completion for openclaw subagent commands

_openclaw_grill() {
    local -a args
    args=(
        '(-s --strict)'{-s,--strict}'[Fail on CONSIDER items]'
        '(-f --focus)'{-f,--focus}'[Focus area]:area:(security performance api)'
        '(-q --quick)'{-q,--quick}'[Quick review - critical issues only]'
        '1:branch:__git_branch_names'
    )
    _arguments $args
}

_openclaw_subagents() {
    local -a args
    args=(
        '(-n --count)'{-n,--count}'[Number of workers]:count:(2 4 8 16)'
        '--labels[Custom worker labels]:labels:'
        '1:task:_message "task description"'
    )
    _arguments $args
}

_openclaw_guard_status() {
    local -a args
    args=(
        '--tail[Show last N decisions]:count:(10 20 50 100)'
    )
    _arguments $args
}

_openclaw_guard() {
    local -a subcommands
    subcommands=(
        'status:Show opus-guard security log'
    )
    
    if (( CURRENT == 1 )); then
        _describe 'guard subcommand' subcommands
    else
        local subcommand=${words[1]}
        case $subcommand in
            status)
                _openclaw_guard_status
                ;;
        esac
    fi
}

_openclaw() {
    local -a commands
    commands=(
        'grill:Pre-PR code review with critic subagent'
        'subagents:Parallelize task across worker subagents'
        'guard:Opus Guard security controls'
        'agent:Manage agent instances'
        'config:View and edit configuration'
        'channels:List and manage messaging channels'
        'gateway:Gateway daemon management'
        'login:Authenticate with AI providers'
        'help:Show help information'
    )
    
    if (( CURRENT == 1 )); then
        _describe 'openclaw command' commands
    else
        local command=${words[1]}
        case $command in
            grill)
                shift words
                (( CURRENT-- ))
                _openclaw_grill
                ;;
            subagents)
                shift words
                (( CURRENT-- ))
                _openclaw_subagents
                ;;
            guard)
                shift words
                (( CURRENT-- ))
                _openclaw_guard
                ;;
        esac
    fi
}

_openclaw "$@"
