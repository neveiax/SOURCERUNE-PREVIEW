# SOURCERUNE — Public Visual Preview

A standalone **visual** preview for UI_01 and UI_02, with switching and image zoom. The new **Interaction Lab** provides separate live UI-only controls for module selection, bypass, six macro values, undo/redo, reset and JSON export. These values are display state and never run audio processing. It does not contain or expose processing code, WASM, audio worklets, product research documents, the private specification, or original repository Git history.

This is **not a full interactive plugin demo or audio processor**. The large reference screenshots remain unchanged, but the four confirmed module-card bounds contain a directly clickable UI overlay synchronized with Interaction Lab. The separate controls in Interaction Lab are functional as a state sandbox only; adjustments are not rendered back onto the screenshot.

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

The UI_01 and UI_02 screenshots have four reference-geometry-anchored, editable module-card overlays. Click a card to focus its Interaction Lab editor; use the small arrows to change its selected approved picture and BYP to change UI-only bypass. Geometry is fail-closed if the displayed screenshot's natural dimensions differ from the approved REF shell. The overlays are an incremental public UI-only interaction layer, **not** full pixel parity, true EQ/spectrum DSP or VST3 audio.
