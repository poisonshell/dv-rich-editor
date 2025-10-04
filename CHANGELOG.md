# Changelog

All notable changes to this project will be documented here. This file now hosts migration guides that were previously in the README.

## [0.7.1] - 2025-10-04
### Changed
- Documentation: Moved 0.7.0 migration section from README into this CHANGELOG.
- Internal: Pruned unused type fields (`applyFormat` legacy artifacts, unused markdown option flags, `removeFormat` method, unused feature/urlHandler stubs).

### Notes
- No runtime behavior changes relative to 0.7.0 besides surface API cleanup (removed unused / undocumented fields). If you did not rely on the removed internal types, no action is required.

## [0.7.0] - 2025-10-04
### Migration (0.6.x → 0.7.0)
Version 0.7.0 removes the generic `applyFormat(format)` API in favor of explicit granular methods for clarity, tree‑shakability and better type inference.

| Old | New |
|-----|-----|
| `applyFormat('bold')` | `toggleBold()` |
| `applyFormat('italic')` | `toggleItalic()` |
| `applyFormat('underline')` | `toggleUnderline()` |
| `applyFormat('strikethrough')` | `toggleStrikethrough()` |
| `applyFormat('code')` | `toggleCode()` |
| `applyFormat('code-block')` | `toggleCodeBlock()` |
| `applyFormat('blockquote')` | `toggleBlockquote()` |
| `applyFormat('h1')` … `h6` | `setHeading(1..6)` |
| `applyFormat('bullet-list')` | `insertBulletList()` |
| `applyFormat('numbered-list')` | `insertNumberedList()` |
| `applyFormat('image')` | `insertImageFormat()` |

### Other Notable Changes
- Introduced internal event bus refactor.
- List handling reworked through plugin architecture.
- Theming standardized around CSS custom properties (`--dv-*`).
- Incremental markdown serialization improvements; fallback threshold logic refined.

### Markdown Output
No markdown output changes are expected versus 0.6.x (aside from minor whitespace normalization and consistent empty list item markers). Run snapshot tests if you depend on exact spacing.

### Action Required
Replace all `applyFormat` usages with the corresponding granular method shown above.

## [0.6.x]
Historical versions prior to 0.7.0 used a generic `applyFormat(format)` API and lacked the refined plugin/theming architecture.

---
Semantic Versioning: PATCH = internal fixes/docs, MINOR = new features (backwards compatible), MAJOR = breaking API changes.
