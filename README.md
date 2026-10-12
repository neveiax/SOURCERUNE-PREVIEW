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

The prior exploratory HTML preview remains available in legacy root files for rollback but is **not** the primary UI. Full actual audio testing must use the private source environment. The official SOURCE repository is now **Private** (verified 2026-10-11). This repository stays **Public** and serves only a sanitized original-UI preview. Sound testing requires a separately authorized private environment; anonymous-browser visual parity remains pending.

## 2026-10-12 Web 測試版本狀態（公開安全說明）

- **公開 PREVIEW**：仍是經安全核准的原版 UI／圖資，僅供觀看與操作介面；**不包含真正 DSP、WebAssembly、AudioWorklet 或私人音訊演算法**，本輪沒有更改 UI 元件與頁面外觀。
- **真正 Web 音訊試聽**：在已授權的 **Private SOURCERUNE SOURCE** 提供驗證候選和私人 GitHub Actions 試聽包。使用者需登入私人倉庫並以 `localhost` 啟動，不將 DSP 發布到此公開倉庫。
- **私人進度總表**：僅在 Private KNOWLEDGE 更新本次測試版的已驗證項目／缺口。公開頁面不得含內部演算法細節。
- **狀態界線**：Public UI 更新與 Private DSP 試聽是兩種不同部署；此項為安全狀態紀錄，不宣稱公開 Web 已可處理音訊。

## 三倉協作規則

全部協作者請先閱讀 [AGENTS.md](AGENTS.md)。正式產品及完整音訊 Web／VST3 在 **SOURCERUNE（Private）**；本倉 **SOURCERUNE-PREVIEW（Public）** 只安全同步核准的原版 UI、公開圖資與 Pages；私人規格、研究和工作單在 **SOURCERUNE-KNOWLEDGE（Private）**。每輪工作統一 Work ID，檢查三倉 main／PR／CI，必要更動同輪協調，不需要改動的倉庫明列 `NO CHANGE`。**禁止把私人 SOURCE 全量推到本公開倉庫**。
