<!-- Context: deployment/navigation | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Deployment Context

**Purpose**: Cloudflare Pages deployment guides, error references, and configuration patterns.

---

## Quick Navigation

### Guides
| File | Description | Priority |
|------|-------------|----------|
| guides/cloudflare-pages-ci.md | CI/CD setup with GitHub Actions | critical |
| guides/cloudflare-custom-domains.md | Custom domain configuration | high |

### Errors
| File | Description | Priority |
|------|-------------|----------|
| errors/deployment-errors.md | Common deployment errors and fixes | critical |

### Lookup
| File | Description | Priority |
|------|-------------|----------|
| lookup/deployment-commands.md | Wrangler CLI commands | medium |
| lookup/environment-variables.md | CI/CD environment setup | medium |

---

## Loading Strategy

**For initial deployment**:
1. Load guides/cloudflare-pages-ci.md
2. Load errors/deployment-errors.md
3. Reference lookup/deployment-commands.md for CLI options

**For custom domain setup**:
1. Load guides/cloudflare-custom-domains.md
2. Reference errors/deployment-errors.md for SSL issues

**For troubleshooting**:
1. Load errors/deployment-errors.md
2. Cross-reference with guides/cloudflare-pages-ci.md

---

## Related Context

- `core/context-system/standards/mvi.md` - Documentation standards
- `core/standards/documentation.md` - Documentation guidelines
- `testing/navigation.md` - Test suite documentation
