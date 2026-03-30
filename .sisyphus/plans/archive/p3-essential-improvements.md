# P3 Essential Improvements — Final Sprint

**Priority**: LOW (Quick wins only)  
**Estimated Time**: 1 hour  
**Scope**: 3 high-value items only (discard rest of P3 backlog)

---

## Selected Items (3/15)

| Item | Description | Time | Value |
|------|-------------|------|-------|
| P3-10 | Sync timeout (30s) | 15 min | Prevents hanging on slow networks |
| P3-11 | Exponential backoff | 30 min | Better retry behavior |
| P3-14 | SRI hashes for CDN | 15 min | Security best practice |

**Total**: 1 hour (vs 12-15 hours for full P3)

---

## Tasks

- [x] **Task 1**: Add 30s timeout to `syncAll()` function
- [x] **Task 2**: Implement exponential backoff for retry delays (1s, 2s, 4s, 8s, 16s)
- [x] **Task 3**: Add SRI integrity hashes to Supabase CDN script tags

---

## Final Verification Wave

- [x] **F1**: All 3 tasks committed and pushed
- [x] **F2**: Tests passing (132+)
- [x] **F3**: Manual verification complete
- [x] **F4**: Archive all P0/P1/P3 plans

---

## Deployment

```bash
# After all tasks complete
git push origin master

# Verify production
open https://tdee.kutasi.dev
```

---

## Archive Plans

After completion:
1. Move P0-critical-blockers.md → `.sisyphus/plans/archive/`
2. Move P1-high-priority.md → `.sisyphus/plans/archive/`
3. Move P3-low-priority-backlog.md → `.sisyphus/plans/archive/`
4. Move this plan → `.sisyphus/plans/archive/`
5. Clear boulder.json
