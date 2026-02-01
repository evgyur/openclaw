#!/bin/bash
# One-command setup for Subagent Workflow System
# This script installs all three skills and enables the workflow system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if clawdbot is installed
check_clawdbot() {
    log_info "Checking if Clawdbot is installed..."

    if ! command -v clawdbot &> /dev/null; then
        log_error "Clawdbot is not installed or not in PATH"
        echo ""
        echo "Please install Clawdbot first:"
        echo "  npm install -g openclaw"
        echo ""
        echo "Or follow the installation guide at:"
        echo "  https://docs.openclaw.ai/installation"
        exit 1
    fi

    log_success "Clawdbot found: $(clawdbot --version 2>/dev/null || echo 'version unknown')"
}

# Install a single skill
install_skill() {
    local skill_path="$1"
    local skill_name=$(basename "$skill_path")

    log_info "Installing skill: $skill_name"

    if clawdbot skill install "$skill_path" 2>&1; then
        log_success "Installed: $skill_name"
    else
        log_error "Failed to install: $skill_name"
        exit 1
    fi
}

# Set configuration
set_config() {
    local key="$1"
    local value="$2"

    log_info "Setting config: $key=$value"

    if clawdbot config set "$key=$value" 2>&1; then
        log_success "Config set: $key"
    else
        log_warning "Could not set $key (may be set already or requires different format)"
    fi
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."

    local failed=0

    # Check if skills are installed
    if clawdbot skill list 2>&1 | grep -q "grill"; then
        log_success "grill skill installed"
    else
        log_error "grill skill not found"
        failed=$((failed + 1))
    fi

    if clawdbot skill list 2>&1 | grep -q "use-subagents"; then
        log_success "use-subagents skill installed"
    else
        log_error "use-subagents skill not found"
        failed=$((failed + 1))
    fi

    if clawdbot skill list 2>&1 | grep -q "opus-guard"; then
        log_success "opus-guard skill installed"
    else
        log_error "opus-guard skill not found"
        failed=$((failed + 1))
    fi

    # Check if workflow is enabled
    if clawdbot config get subagent_workflow.enabled 2>&1 | grep -q "true"; then
        log_success "subagent_workflow.enabled=true"
    else
        log_warning "subagent_workflow may not be enabled"
    fi

    return $failed
}

# Show configuration help
show_config_help() {
    echo ""
    log_info "Optional configuration adjustments:"
    echo ""
    echo "Grill strictness:"
    echo "  clawdbot config set grill.mode=balanced  # options: strict|balanced|permissive"
    echo ""
    echo "Opus-Guard risk threshold (0.0-1.0):"
    echo "  clawdbot config set opus_guard.risk_threshold=0.7"
    echo ""
    echo "Max parallel workers (use-subagents):"
    echo "  clawdbot config set use_subagents.max_workers=6"
    echo ""
    echo "See full docs: ./README.md"
}

# Main installation flow
main() {
    echo ""
    echo "========================================"
    echo "  Subagent Workflow System Installer  "
    echo "========================================"
    echo ""

    # Check prerequisites
    check_clawdbot
    echo ""

    # Install skills
    log_info "Installing Subagent Workflow skills..."
    echo ""

    install_skill "skills/grill"
    install_skill "skills/use-subagents"
    install_skill "skills/opus-guard"
    echo ""

    # Enable workflow system
    set_config "subagent_workflow.enabled" "true"
    echo ""

    # Set reasonable defaults
    log_info "Setting default configuration..."
    set_config "opus_guard.risk_threshold" "0.7"
    set_config "use_subagents.max_workers" "6"
    set_config "grill.mode" "balanced"
    echo ""

    # Verify installation
    verify_installation
    local verify_status=$?
    echo ""

    # Show success message
    if [ $verify_status -eq 0 ]; then
        echo "========================================"
        log_success "Installation complete!"
        echo "========================================"
        echo ""
        echo "All three skills installed:"
        echo "  • grill - Code review with quality gates"
        echo "  • use-subagents - Parallel task decomposition"
        echo "  • opus-guard - Safety rails for high-risk actions"
        echo ""
        echo "The subagent workflow system is now enabled."
        echo ""
        echo "Quick start:"
        echo '  use-subagents "Analyze our API architecture options"'
        echo "  /grill"
        echo ""
        show_config_help
        echo ""
        echo "See documentation:"
        echo "  README.md            - Architecture and configuration"
        echo "  integration-demo.md  - Full walkthrough"
        echo "  test-scenarios.md   - Test suite and validation"
        echo ""
        exit 0
    else
        echo "========================================"
        log_warning "Installation completed with errors"
        echo "========================================"
        echo ""
        echo "Some components failed to install. Please check the errors above."
        echo ""
        echo "To retry, you can run individual commands:"
        echo "  clawdbot skill install skills/grill"
        echo "  clawdbot skill install skills/use-subagents"
        echo "  clawdbot skill install skills/opus-guard"
        echo "  clawdbot config set subagent_workflow.enabled=true"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
