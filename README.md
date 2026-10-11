# SOURCERUNE — Public Visual Preview

A standalone **visual** preview for UI_01 and UI_02, with switching and image zoom. The new **Interaction Lab** provides separate live UI-only controls for module selection, bypass, six macro values, undo/redo, reset and JSON export. These values are display state and never run audio processing. It does not contain or expose processing code, WASM, audio worklets, product research documents, the private specification, or original repository Git history.

This is **not a full interactive plugin demo or audio processor**. The large reference screenshots remain unchanged, but the four confirmed module-card bounds are independent, opaque HTML controls synchronized with Interaction Lab. The rest of the reference screenshot stays unchanged. The separate controls in Interaction Lab are functional as a state sandbox only; adjustments are not rendered back onto the screenshot.

### Publish

1. Merge the standalone site and its allowlist guard.
2. The one-time GitHub Actions workflow downloads *only two pinned, already-public UI render PNGs*, validates their exact Git blob SHA, and commits them to this repository.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, and save. The public website will then use the PNG files stored in this repository and not rely on continued access to the original source.
4. Verify the website anonymously before changing the original SOURCERUNE repository visibility.

### Security and limits

Public paths are enforced by `scripts/check_allowlist.py`; do not weaken it merely to make a build pass. Any full interactive public implementation requires separate review for browser-visible IP, audio processing access control, and UI parity. The original SOURCERUNE must remain intact and **must not become Private solely on the basis of this static preview** if interactive Web testing is still required.

### Approved module artwork

The UI-only Interaction Lab uses 50 pinned, previously public `art-approved-v2` PNGs from the four core module categories across both interfaces. `assets/approved_ui_manifest.json` supplies per-file source paths, sizes and immutable Git blob SHAs. The workflow verifies and stores only this allowlisted art inside the clean Preview repo; there is no cross-repository runtime dependency after the one-time capture. Assets change visually when you select modules. The original UI screenshot remains fixed; audio processing and proprietary implementation stay excluded.

### Direct card controls

The UI_01 and UI_02 previews now have four independently rendered HTML module cards with approved source art, native model selectors, previous/next controls, and editor focus. UI_01 shows a bypass switch on each card; UI_02 keeps bypass in Interaction Lab per its public UI template. Geometry is fail-closed if the displayed screenshot's natural dimensions differ from the approved REF shell. The HTML cards are an incremental public UI-only layer, **not** full pixel parity, true EQ/spectrum DSP or VST3 audio.

### Native module-card milestone (2026-10-11)

Each of eight confirmed card regions now uses a real, focusable HTML module component instead of the old transparent hotspot over a drawn card. The original screenshot remains a static reference outside those four card regions. Browser UI state is shared, including model selection, approval-pinned art, bypass in the correct UI, undo/redo, zoom, and layout switching. Internal styling is not yet one-pixel REF-parity, full dynamic EQ/spectrum, or a real audio plugin.
