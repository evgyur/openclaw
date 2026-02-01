#!/usr/bin/env bash
# Bash completion for openclaw subagent commands

_openclaw_grill() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    case "${prev}" in
        -f|--focus)
            COMPREPLY=( $(compgen -W "security performance api" -- ${cur}) )
            return 0
            ;;
        grill)
            # Complete with git branches
            local branches=$(git branch --format='%(refname:short)' 2>/dev/null)
            COMPREPLY=( $(compgen -W "${branches}" -- ${cur}) )
            return 0
            ;;
    esac
    
    opts="-s --strict -f --focus -q --quick"
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
}

_openclaw_subagents() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    opts="-n --count --labels"
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
}

_openclaw_guard() {
    local cur prev opts subcommand
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Find the subcommand
    for i in "${!COMP_WORDS[@]}"; do
        if [[ "${COMP_WORDS[$i]}" == "status" ]]; then
            subcommand="status"
            break
        fi
    done
    
    case "${subcommand}" in
        status)
            opts="--tail"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
    esac
    
    # No subcommand yet, offer them
    opts="status"
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
}

_openclaw() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Check which command we're completing
    local cmd=""
    for i in "${!COMP_WORDS[@]}"; do
        case "${COMP_WORDS[$i]}" in
            grill)
                cmd="grill"
                break
                ;;
            subagents)
                cmd="subagents"
                break
                ;;
            guard)
                cmd="guard"
                break
                ;;
        esac
    done
    
    case "${cmd}" in
        grill)
            _openclaw_grill
            return 0
            ;;
        subagents)
            _openclaw_subagents
            return 0
            ;;
        guard)
            _openclaw_guard
            return 0
            ;;
    esac
    
    # Top-level completion
    if [[ ${cur} == -* ]]; then
        COMPREPLY=( $(compgen -W "-h --help -v --version" -- ${cur}) )
    else
        opts="grill subagents guard agent config channels gateway login help"
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
    fi
}

complete -F _openclaw openclaw
