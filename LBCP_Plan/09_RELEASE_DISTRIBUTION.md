# 09 — Release & Distribution

## Release tiers
### Working tier (default ship)
- Core chat + script editor + settings + notebook
- Provider readiness + health indicator
- Toast feedback
- Advanced features OFF by default

### Advanced tier (flagged)
- Screenshot
- Vision analysis
- Mascot
- Dockable builder

## Versioning
- Keep manifest version in sync with UI About version
- Tag git:
  - `release-vX.Y.Z`
  - `release-candidate-vX.Y.Z`

## Packaging
- Ensure correct extension folder structure
- Remove dev artifacts (.debug, scratch docs)
- Confirm script load order matches index.html

## Final release gate
- All checks in `07_TESTING_CHECKLISTS.md` section B pass
- Install instructions validated on a clean machine profile
