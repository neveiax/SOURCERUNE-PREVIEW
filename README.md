# SOURCERUNE｜Public Web Preview

這是正式的公開 UI_01／UI_02 網頁及經核准的實驗性 Web 音訊測試版。Private SOURCE 是唯一正式原始碼／Native VST3 來源，Private KNOWLEDGE 管理規範、250 主表與研究證據。

## 目前實際公開的音訊

- `Web/App/audio/public-dsp-manifest.json` 的 `published: true` 代表已發布固定 SHA256 的 **SRC001～017 共 17 種實驗性 C++→WASM 模型**、HPF、三段 EQ、AudioWorklet；來源 SOURCE commit `6cf8bc3c82aaea52a7affcb6d5e2d4d9be716923`。
- **不是 17 種已實機校準的正式產品、不是 250/250、不是 74 Factory Preset 或 Native DAW Host 完整驗收。** 新的 SRC018～021 和任何未核准模型、C++ 原始碼、機密配方／研究都不可自行公開。
- 任何人都能下載／逆向公開 WASM。新增 binary 必須另行核准精確來源 SHA／授權、固定 hash 白名單、Native/WASM 測試及真 Chromium 音訊驗證。歷史的 UI-only／DRY-only 階段已被取代。
- 資料來源：[public manifest](Web/App/audio/public-dsp-manifest.json)／[固定二進位檢查](scripts/check_public_dsp_release.py)。不能單靠 manifest 存在就宣稱所有聲音已驗收。

**網站：** https://ureia-dev.github.io/SOURCERUNE-PREVIEW/Web/App/

## 最新版本與研發狀態

- 每次 GitHub push 都產生該倉新的 `Vx.x.xxx` tag；**只有 Pages 成功部署的 main SHA 對應線上正式版本**。研究 branch 的較新 tag 不等於 Web 已更新。
- 更近期的 UI CSS：PREVIEW [#35](https://github.com/ureia-dev/SOURCERUNE-PREVIEW/pull/35) 與 SOURCE [#161](https://github.com/ureia-dev/SOURCERUNE/pull/161) 尚未合併，Public Chromium PLAY pointer 事件測試失敗；不可跳過驗收直接部署。
- [AGENTS.md](AGENTS.md) 是本倉唯一公開安全與協作入口。每次先比對 Private SOURCE 原版和明確可公開的檔案，再經 allowlist／必要 Fast／真瀏覽器測試。不得為 Web 改動建立第二套獨立畫面。

所有時間性狀態應重新查 [main、PR 與 Pages Actions](https://github.com/ureia-dev/SOURCERUNE-PREVIEW/actions)；舊快照保留在 Git history，不應繼續複寫成新指令。
