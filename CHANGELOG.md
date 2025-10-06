# Changelog

All notable changes to this project will be documented here. This file now hosts migration guides that were previously in the README.

## [0.7.7] - 2025-10-05
### Added
- `insertMarkdown(markdown, options)` API for semantic insertion (supports `parse`, `literal`, `sanitize`, `schedule`, `collapseSelection`).
- Selection format introspection (`SelectionFormatState`) with presence values: `none | partial | all` (and `mixed` for headings across differing levels).
- React hook: `useFormatState()` returning live tri‑state formatting info for toolbar components.
- Heading level resolver: `getActiveHeadingLevel()` (returns 1–6 or `null` for none/mixed) enabling accurate heading dropdowns.
- True inline toggle/unwrapping logic (`toggleInlineFormat` internal) backing public helpers (`toggleBold/Italic/Underline/Strikethrough/Code`).
- Caret exit normalization after inline elements (`ensureCaretOutsideInlineFormat`) to prevent “stuck formatting” when typing at span boundaries.
- Image plugin improvements: enforced usage of `insertMarkdown`; alt text derivation & metadata sanitization pipeline hardened.
- Additional test suites: tri‑state coverage, inline unwrapping (multi‑span italic, mixed bold), serializer integrity, image markdown correctness.

### Changed
- Inline formatting toggles now unwrap fully formatted selections instead of nesting new `<strong>/<em>` tags.
- Markdown escaping refined: parentheses are no longer over‑escaped (improves readability for images/links and avoids double escaping).
- Centralized inline toggle logic replaces scattered conditional wrappers in earlier code.
- Extended `format-change` event payload to include `state` object (backwards compatible—old consumers still receive `formats`).

### Fixed
- Eliminated duplicate nested formatting elements on repeated toggles (previously could produce `<strong><strong>text</strong></strong>` in edge cases).
- Correct handling of partially formatted selections (no longer treats mixture as fully formatted causing unwanted unwraps or extra wraps).
- Prevented incorrect escaping in serialized markdown for image/link parentheses.
- Improved resilience of italic unwrapping across disjoint spans.

### Documentation
- README updated: new sections for Inline Toggle Semantics, Heading Level Introspection, `insertMarkdown` usage, and revised feature list.
- 
### Migration Notes (0.7.x → 0.7.7)
No breaking API changes relative to 0.7.1. If upgrading from <0.7.0 ensure you have already migrated away from the deprecated `applyFormat(format)` API (see 0.7.0 section below). Recommended adjustments:
1. Prefer `insertMarkdown` over manual `insertText` + formatting for programmatic insertions (slash commands, AI completions, images).
2. Update toolbars to reflect partial/mixed states using `useFormatState()` instead of relying solely on `isFormatActive`.
3. If you previously depended on parentheses being escaped in raw text output, adjust snapshot tests accordingly.

### Internal
- Minor performance considerations in format state computation prepared (future caching hooks possible, none implemented yet).

---

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
