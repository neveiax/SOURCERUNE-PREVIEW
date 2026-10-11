# SOURCERUNE — Public Visual Preview

A standalone **visual-only** preview for UI_01 and UI_02, with interface switching and image zoom. It does not contain or expose processing code, WASM, audio worklets, product research documents, the private specification, or original repository Git history.

This is **not a live audio or fully interactive plugin demo**. Controls visible inside the screenshots do not process audio.

### Publish

1. Merge the standalone site and its allowlist guard.
2. The one-time GitHub Actions workflow downloads *only two pinned, already-public UI render PNGs*, validates their exact Git blob SHA, and commits them to this repository.
3. In repository **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, and save. The public website will then use the PNG files stored in this repository and not rely on continued access to the original source.
4. Verify the website anonymously before changing the original SOURCERUNE repository visibility.

### Security and limits

Public paths are enforced by `scripts/check_allowlist.py`; do not weaken it merely to make a build pass. Any full interactive public implementation requires separate review for browser-visible IP, audio processing access control, and UI parity. The original SOURCERUNE must remain intact and **must not become Private solely on the basis of this static preview** if interactive Web testing is still required.
