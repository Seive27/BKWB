---
title: 17-DEVELOPMENT-WORKFLOW
created: 2026-08-09T12:08:41.126Z
updated: 2026-08-09T12:08:41.126Z
---

# 17-DEVELOPMENT-WORKFLOW

# BKWB — Development and Git Workflow

## Repository

The project is maintained through Git/GitHub.

Multiple teammates work on the same repository.

## Important Git Principle

Before pulling another teammate's changes, check whether you have local modifications.

Useful commands:

```bash
git status
git diff
Pulling Teammate Changes

If the working tree is clean:

git pull origin main

If you have local changes, do not blindly pull.

Either:

commit your work
stash your work
or otherwise safely preserve it

before pulling.

Pushing

Do not assume pushing automatically destroys a teammate's changes.

Git merges commits based on repository history.

However, conflicts can happen if both people changed the same files/lines.

Previous Merge Situation

The project previously encountered:

You have not concluded your merge (MERGE_HEAD exists).
Please, commit your changes before merging.

This means Git had an unfinished merge.

Always inspect:

git status

before attempting another pull.

AI Agent Changes

When using AI coding agents:

Inspect the current branch.
Inspect git status.
Know what files the agent changed.
Review the diff.
Run TypeScript checks.
Test affected functionality.
Commit intentionally.
Validation

The four applications have previously passed:

tsc --noEmit

with zero errors after major updates.

Maintain this standard after significant changes.

Important

AI agents should not:

reset Git history
force push
delete branches
overwrite teammate work
reset the database

without explicit instruction.

Related
[[01-SYSTEM-ARCHITECTURE]]
[[15-CURRENT-PROGRESS]]
[[18-AI-AGENT-RULES]]