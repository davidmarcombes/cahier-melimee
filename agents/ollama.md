# Ollama Setup (LLM Exercise Validation)

`npm run validate:llm` uses a local LLM via [Ollama](https://ollama.com) to verify exercise answers.
The cache in `scripts/validate-llm-cache.csv` means each file is only sent once unless it changes.

## Install

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows — download the installer from https://ollama.com/download
```

## Pull a model

The default model is `qwen2.5:7b` — strong maths and French, ~4.7 GB, partially GPU-accelerated
if you have ≥ 4 GB VRAM (Ollama offloads as many layers as fit).

```bash
ollama pull qwen2.5:7b
```

| Model | Size | Notes |
|---|---|---|
| `qwen2.5:7b` | ~4.7 GB | **Default.** Best accuracy/speed balance. Partial GPU offload on 4 GB VRAM cards. |
| `qwen2.5:14b` | ~9 GB | Better still. Good if you have ≥ 16 GB RAM and can wait ~20 s/exercise. |
| `qwen2.5:3b` | ~2 GB | Faster, slightly weaker reasoning. |
| `qwen2.5:1.5b` | ~1 GB | Minimal machine or quick smoke-test only. |
| `phi4:14b` | ~9 GB | Microsoft, excellent at maths, slower. |
| `gemma2:9b` | ~6 GB | Google, accurate French. |

## Run

Ollama starts automatically when you pull or run a model. To start it explicitly:

```bash
ollama serve
```

## Validate exercises

```bash
# Smoke test: validate N exercises with full verbose output
npm run validate:llm -- --count=1 --verbose   # one file (alias: --one)
npm run validate:llm -- --count=5 --verbose   # five files

# Validate everything new or changed
npm run validate:llm

# Override model
npm run validate:llm -- --model=qwen2.5:3b

# Scope to a level or type
npm run validate:llm -- --dir=src/fr/exercices/cm1
npm run validate:llm -- --type=problem

# Re-validate everything (ignore cache)
npm run validate:llm -- --force

# Quiet: only print failures
npm run validate:llm -- --failures-only

# Combine flags freely
npm run validate:llm -- --one --verbose --type=column-op
```

`--one --verbose` (aliased as `validate:llm:smoke`) prints the full system prompt, the user
prompt sent for that exercise, the raw model response, timing, and the parsed verdict — useful
for tuning prompts or debugging a new model.

## Cache

Results are stored in `scripts/validate-llm-cache.csv`. Each model gets its own column,
added automatically on first use:

```
path,hash,qwen2.5:14b,qwen2.5:7b
src/fr/exercices/ce1/.../01-lire.md,a3f2b1c4,ok,ok
src/fr/exercices/ce2/.../compare.md,b5e9f203,,fail
src/fr/exercices/cm1/.../clock.md,cc2a1d08,skip,skip
```

- `ok` — all exercises in the file passed for that model
- `fail` — at least one answer flagged incorrect (always re-checked on next run)
- `skip` — visual-only type or no verifiable answer
- *(empty)* — not yet validated by that model

When a file changes its hash, all model columns for that row are cleared automatically.

Commit the cache so the whole team benefits from already-validated exercises. Disagreements
between models (one `ok`, another `fail`) are immediately visible in the CSV.

## What gets checked

| Types verified by LLM | Types skipped |
|---|---|
| `problem`, `number-check` | `ruler` (visual measurement) |
| `true-false`, `mcq`, `multi-question` | `svg-tiles`, `click-blocks` (visual) |
| `compare`, `sequence`, `bounding` | `compare-groups`, `count-objects`, `number-hunt` (apps) |
| `column-op`, `pyramid`, `fill-table` | Generated exercises (`generator:` field) |
| `convert`, `matching`, `sort`, `drag-sort` | |
| `clock`, `fraction`, `fraction-check` | |
| `number-line`, `coordinate-grid`, `base-10`, `logic-grid` | |

## Troubleshooting

**"Ollama not reachable"** — run `ollama serve` in a separate terminal.

**"model not found"** — run `ollama pull qwen2.5:1.5b` (or your chosen model).

**Too slow** — reduce concurrency: `--concurrency=2`, or use a smaller model.

**False positives** — tiny models occasionally flag correct answers. Check the reason shown,
then re-run with `--force --type=<type>` to get a second opinion. If the exercise is correct,
the model's `fail` verdict will be overwritten on next run once you confirm it.
