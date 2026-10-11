# SOURCERUNE — Public Original Web UI (no audio processor)

The live site now serves the **original SOURCERUNE Web/App index, CSS and UI controls** from pinned SOURCE main `c035db4d`, instead of an independently recreated UI.

- Live path: `Web/App/index.html` (root redirects automatically).
- UI artwork: all pinned public PNGs copied byte-exact into `Assets/UI/`.
- GUI JavaScript/CSS: source-exact except narrowly scoped public-audio disabling and public labels.
- DSP C++/AudioWorklet/WASM: **not copied**.
- Factory sound recipes: removed from public preset JSON; preset names, artwork and selection remain.
- Play/audio meters/spectrum driven by audio are **disabled**, not secretly implemented or simulated. Display-only EQ curve and other original visual frontend source remain browser-visible.
- Source SHA and per-file Git hashes: `original_web_port_manifest.json`.
- Secure verification: `scripts/check_original_port.py`, `scripts/check_allowlist.py`.

The prior exploratory HTML preview remains available in legacy root files for rollback but is **not** the primary UI. Full actual audio testing must use the private source environment. Do not change the original repository to Private until current anonymous browser layout tests and private audio test path are verified.
