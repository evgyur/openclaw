# Rollback Procedure

## Quick Rollback

Revert to previous commit:

```bash
cd /home/eyurc/clawd
git log --oneline skills/chip-fai/ | head -5  # Find commit hash
git checkout <commit-hash> -- skills/chip-fai/
```

## Rollback to Specific Version

```bash
# List available versions
git log --oneline skills/chip-fai/

# Rollback to specific commit
git checkout <commit-hash> -- skills/chip-fai/

# Verify health
cd skills/chip-fai
bash scripts/health_check.sh
```

## Known Good Commits

- `e68c83094` - Clean up slop (2026-01-24)
- `53777846c` - LARP fixes (2026-01-24)
- `42082ca7a` - Code quality pass (2026-01-24)

## Post-Rollback Steps

1. Verify configuration:
   ```bash
   cat .env.example
   # Ensure .env exists with valid token
   ```

2. Run health check:
   ```bash
   bash scripts/health_check.sh
   ```

3. Test generation:
   ```bash
   bash scripts/generate.sh --model recraft --prompt "rollback test" --aspect-ratio square
   ```

4. Verify output:
   ```bash
   ls -lh media/recraft_*.jpg | tail -1
   ```

## Rollback Cleanup

Remove failed state files:

```bash
rm -rf state/*
rm -rf logs/*
```

## Emergency Disable

To completely disable the skill:

```bash
cd /home/eyurc/clawd
git rm -r skills/chip-fai/
git commit -m "Emergency disable chip-fai"
```
