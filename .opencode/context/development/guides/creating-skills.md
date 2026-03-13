<!-- Context: development/guides/creating-skills | Priority: medium | Version: 1.0 | Updated: 2026-03-11 -->

# Guide: Creating Agent Skills

**Purpose**: Create reusable skill definitions for AI agents with domain-specific workflows.

**Last Updated**: 2026-03-11

---

## What is a Skill?

Skills are markdown files in `.opencode/skills/` that provide specialized instructions for AI agents on specific domains.

---

## Skill Structure

```
.opencode/skills/skill-name/
├── SKILL.md          # Main definition
├── resources/        # Supporting files
│   ├── templates/
│   └── examples/
└── README.md
```

---

## Step 1: Create Directory

```bash
mkdir -p .opencode/skills/skill-name/resources/templates
touch .opencode/skills/skill-name/SKILL.md
```

---

## Step 2: Write SKILL.md Template

```markdown
# Skill: Skill Name

**Purpose**: One-sentence description.
**Domain**: Area of expertise.

## When to Use
- Condition 1
- Condition 2

## How to Load
task(subagent_type="skill-name", description="Task", prompt="Instructions")

## Core Workflows
### Workflow 1
1. Step one
2. Step two

## Resources
- `resources/templates/template.md`
- `resources/examples/example.js`

## Related Skills
- `../other-skill/SKILL.md`
```

---

## Step 3: Add Resources (Optional)

### Templates
```markdown
<!-- resources/templates/migration.md -->
-- Migration: {{name}}
-- Up: {{up_migration}}
-- Down: {{down_migration}}
```

### Examples
```javascript
// resources/examples/auth-example.js
await Auth.signInWithMagicLink('user@example.com');
```

---

## Best Practices

- **One responsibility**: Each skill does one thing well
- **Actionable**: Clear steps, not just theory
- **Tested**: Verify workflows actually work
- **Linked**: Reference related skills and context files
- **Keep under 200 lines** (MVI principle)

---

## Example: Supabase Auth Skill

```markdown
# Skill: Supabase Auth

**Purpose**: Handle all Supabase authentication tasks.
**Domain**: Authentication, Supabase

## When to Use
- Setting up magic link auth
- Configuring OAuth providers
- Debugging auth issues

## How to Load
task(subagent_type="supabase-auth", description="Set up auth", prompt="Configure magic link")

## Core Workflows
### Magic Link Setup
1. Configure email provider in Supabase dashboard
2. Set redirect URLs
3. Test with real email

## Related Skills
- `../supabase-sync/SKILL.md`
- `../rls-policies/SKILL.md`
```

**References**:
- `.opencode/skills/` — Skills directory
- `.opencode/context/` — Context files
- `AGENTS.md` — Agent guidelines

**Related**:
- [concepts/model-context-protocol.md](../concepts/model-context-protocol.md)
- [guides/pre-commit-setup.md](pre-commit-setup.md)

(End of file - total 108 lines)
