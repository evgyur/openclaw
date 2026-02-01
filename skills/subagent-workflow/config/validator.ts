#!/usr/bin/env bun
/**
 * Subagent Workflow Config Validator
 * CLI tool to validate and inspect configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  loadConfig, 
  loadPreset, 
  validateConfig, 
  saveConfig, 
  getConfigPath,
  DEFAULT_CONFIG,
  type SubagentWorkflowConfig 
} from './config';

const PRESETS = ['enterprise', 'solo-dev', 'team', 'paranoia'];

function printUsage(): void {
  console.log(`
subagent-workflow-config - Configuration validator for Subagent Workflow

Usage:
  config-validator <command> [options]

Commands:
  validate [path]     Validate a config file (default: auto-detect)
  preset <name>       Show a preset configuration
  init [preset]       Create a new config file (optionally from preset)
  current             Show current effective configuration
  diff [path]         Show differences from defaults
  schema              Output JSON schema
  presets             List available presets

Options:
  -o, --output <path>  Save output to file
  -j, --json           Output as JSON
  -h, --help           Show this help

Examples:
  config-validator validate ./my-config.yaml
  config-validator preset enterprise
  config-validator init team
  config-validator current --json
  config-validator diff > my-diff.txt
`);
}

function formatConfig(config: SubagentWorkflowConfig, format: 'yaml' | 'json'): string {
  if (format === 'json') {
    return JSON.stringify(config, null, 2);
  }
  
  // Simple YAML formatter
  let yaml = `# Subagent Workflow Configuration\n`;
  yaml += `version: "${config.version}"\n\n`;
  
  yaml += `# Grill Settings\n`;
  yaml += `grill:\n`;
  yaml += `  strictness: ${config.grill.strictness}\n`;
  yaml += `  focusAreas: [${config.grill.focusAreas.join(', ')}]\n`;
  yaml += `  requireTestsFor:\n`;
  for (const pattern of config.grill.requireTestsFor) {
    yaml += `    - "${pattern}"\n`;
  }
  yaml += `  autoApproveOwnPRs: ${config.grill.autoApproveOwnPRs}\n`;
  yaml += `  maxReviewDepth: ${config.grill.maxReviewDepth}\n`;
  yaml += `  failOnErrors: ${config.grill.failOnErrors}\n\n`;
  
  yaml += `# Use Subagents Settings\n`;
  yaml += `useSubagents:\n`;
  yaml += `  enabled: ${config.useSubagents.enabled}\n`;
  yaml += `  defaultWorkerCount: ${config.useSubagents.defaultWorkerCount}\n`;
  yaml += `  maxParallel: ${config.useSubagents.maxParallel}\n`;
  yaml += `  timeoutSeconds: ${config.useSubagents.timeoutSeconds}\n`;
  yaml += `  synthesisModel: ${config.useSubagents.synthesisModel}\n\n`;
  
  yaml += `# Opus Guard Settings\n`;
  yaml += `opusGuard:\n`;
  yaml += `  enabled: ${config.opusGuard.enabled}\n`;
  yaml += `  riskThresholds:\n`;
  for (const [key, value] of Object.entries(config.opusGuard.riskThresholds)) {
    yaml += `    ${key}: ${value}\n`;
  }
  yaml += `  escalationChannel: ${config.opusGuard.escalationChannel}\n`;
  yaml += `  emergencyOverride:\n`;
  yaml += `    enabled: ${config.opusGuard.emergencyOverride.enabled}\n`;
  yaml += `    requireConfirmation: ${config.opusGuard.emergencyOverride.requireConfirmation}\n`;
  yaml += `    timeoutSeconds: ${config.opusGuard.emergencyOverride.timeoutSeconds}\n\n`;
  
  return yaml;
}

function showValidationResult(result: { valid: boolean; errors: string[] }, filePath?: string): void {
  if (result.valid) {
    console.log('✅ Configuration is valid');
    if (filePath) {
      console.log(`   File: ${filePath}`);
    }
  } else {
    console.log('❌ Configuration validation failed');
    console.log('   Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
    process.exit(1);
  }
}

function calculateDiff(config: Partial<SubagentWorkflowConfig>): string[] {
  const diffs: string[] = [];
  
  function compare(obj1: unknown, obj2: unknown, path: string): void {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      if (obj1 !== obj2) {
        diffs.push(`${path}: ${JSON.stringify(obj2)} (default: ${JSON.stringify(obj1)})`);
      }
      return;
    }
    
    if (obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        diffs.push(`${path}: ${JSON.stringify(obj2)} (default: ${JSON.stringify(obj1)})`);
      }
      return;
    }
    
    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);
    const allKeys = new Set([...keys1, ...keys2]);
    
    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      compare(
        (obj1 as Record<string, unknown>)[key],
        (obj2 as Record<string, unknown>)[key],
        newPath
      );
    }
  }
  
  compare(DEFAULT_CONFIG, config, '');
  return diffs;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    printUsage();
    return;
  }
  
  const command = args[0];
  const format = args.includes('-j') || args.includes('--json') ? 'json' : 'yaml';
  const outputIndex = args.findIndex(a => a === '-o' || a === '--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
  
  try {
    switch (command) {
      case 'validate': {
        const filePath = args[1];
        const config = loadConfig(filePath);
        const result = validateConfig(config);
        
        if (format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          showValidationResult(result, filePath || getConfigPath() || 'default');
        }
        break;
      }
      
      case 'preset': {
        const presetName = args[1];
        if (!presetName || !PRESETS.includes(presetName)) {
          console.error(`Error: Unknown preset "${presetName}"`);
          console.error(`Available presets: ${PRESETS.join(', ')}`);
          process.exit(1);
        }
        
        const config = loadPreset(presetName);
        const output = formatConfig(config, format);
        
        if (outputPath) {
          fs.writeFileSync(outputPath, output, 'utf-8');
          console.log(`✅ Saved ${presetName} preset to ${outputPath}`);
        } else {
          console.log(output);
        }
        break;
      }
      
      case 'init': {
        const presetName = args[1];
        const targetPath = path.join(process.env.HOME || '.', '.clawdbot', 'subagent-workflow.yaml');
        
        let config: SubagentWorkflowConfig;
        if (presetName) {
          if (!PRESETS.includes(presetName)) {
            console.error(`Error: Unknown preset "${presetName}"`);
            console.error(`Available presets: ${PRESETS.join(', ')}`);
            process.exit(1);
          }
          config = loadPreset(presetName);
        } else {
          config = DEFAULT_CONFIG;
        }
        
        saveConfig(config, targetPath);
        console.log(`✅ Created configuration at ${targetPath}`);
        if (presetName) {
          console.log(`   Based on: ${presetName} preset`);
        } else {
          console.log(`   Using default settings`);
        }
        break;
      }
      
      case 'current': {
        const config = loadConfig();
        const output = formatConfig(config, format);
        
        if (outputPath) {
          fs.writeFileSync(outputPath, output, 'utf-8');
          console.log(`✅ Saved current configuration to ${outputPath}`);
        } else {
          console.log(output);
        }
        break;
      }
      
      case 'diff': {
        const filePath = args[1];
        const config = loadConfig(filePath);
        const diffs = calculateDiff(config);
        
        if (diffs.length === 0) {
          console.log('Configuration matches defaults (no differences)');
        } else {
          console.log('Differences from default configuration:');
          console.log('');
          for (const diff of diffs) {
            console.log(`  ${diff}`);
          }
        }
        break;
      }
      
      case 'schema': {
        const schemaPath = path.join(__dirname, 'schema.json');
        if (fs.existsSync(schemaPath)) {
          const schema = fs.readFileSync(schemaPath, 'utf-8');
          console.log(schema);
        } else {
          console.error('Error: schema.json not found');
          process.exit(1);
        }
        break;
      }
      
      case 'presets': {
        console.log('Available presets:');
        console.log('');
        for (const preset of PRESETS) {
          const config = loadPreset(preset);
          console.log(`  ${preset}`);
          console.log(`    Grill: ${config.grill.strictness}, Opus Guard: ${config.opusGuard.enabled ? 'enabled' : 'disabled'}`);
          console.log(`    Workers: ${config.useSubagents.defaultWorkerCount}, Telemetry: ${config.telemetry.enabled ? 'on' : 'off'}`);
          console.log('');
        }
        break;
      }
      
      default:
        console.error(`Error: Unknown command "${command}"`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
