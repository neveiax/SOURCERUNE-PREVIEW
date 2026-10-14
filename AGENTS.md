# SOURCERUNE-PREVIEW｜公開協作者現行規則

> 2026-10-14 生效。使用繁體中文。本文件取代舊版 README／AGENTS 內彼此衝突的 UI-only／DRY ONLY／絕對禁止已核准 WASM 等歷史說法；歷史仍可在 Git 紀錄閱讀。

## 三倉唯一分工

- `ureia-dev/SOURCERUNE`（Private）：正式 Native VST3、私人 C++／WASM／AudioWorklet、原版 Web UI_01/UI_02、受保護 DSP、REF。
- `ureia-dev/SOURCERUNE-PREVIEW`（本 Public）：經安全審核的同源原版 UI、核准公開音訊編譯子集及 GitHub Pages。所有公開 PR、產物、binary 都可被下載／逆向。
- `ureia-dev/SOURCERUNE-KNOWLEDGE`（Private）：正式三倉政策、唯一 250 項工作總表、五視窗板、研究與保密證據。Public 只引用安全摘要與穩定文件 ID，不可複製私人原文。
- 開始前**實際查**三倉 live main、工作 branch／PR、Fast/Chromium、Pages、對應 V 版 tag；再讀 Private KNOWLEDGE `knowledge/00_INDEX.md`。無法取得必要私人政策時標 `BLOCKED: PRIVATE KNOWLEDGE UNAVAILABLE`。

## 公開音訊的精確例外

`Web/App/audio/public-dsp-manifest.json` 中 `published:true` 與來源 `6cf8bc3c82aaea52a7affcb6d5e2d4d9be716923` 只批准精確白名單內 **SRC001～017 實驗性 C++→WASM**、HPF／三段 EQ 和對應薄 AudioWorklet。固定 SHA256 驗證由可信 main 的 `scripts/check_public_dsp_release.py` 執行。

這個例外**不能擴及**新的 SRC018～021、Private C++ 原始碼、研究、Preset 配方、未核准二進位、私人 Git 歷史或完整 250 模型。任何新版 WASM 可被逆向，先具體批准與授權查核、逐檔 source/blob SHA 和 hash、Native-WASM 及真 Chrome Audio Gate，才能公開。研究原型不能冒稱實機校準／Factory／DAW Host 全驗收。

## UI 開發、驗收、部署

1. SOURCE 原版 UI 與 Public PREVIEW 核准安全檔案**同一批次**修改、對照；不另造第二套 Web。只用核准的 Common/PNG 素材，未核准 V2 不替換。
2. **Public 推送之前**先核對 allowlist、private→public 差異、授權、來源 Git blob、敏感資料及已核准音訊 binary。不可整倉鏡像 Private。
3. 一件任務沿用單一有效 Work ID／PR，不重開競爭修復線。跑原有必要 Fast、安全檢查、真 Chromium UI／播放事件；測試失敗不能盲 rerun 或繞過，第二次相同失敗查根因。不得自行增加 Deep／Release／安全壓測次數。
4. 合併後才檢查 Pages 成功的 main SHA、真 Web 互動和音訊輸出，分別記 `VERIFIED/PARTIAL/PENDING`。Native/Host、私人 DSP 及使用者試聽另列；不能靠 UI CSS hash 相同宣稱聲音 1:1。
5. Private KNOWLEDGE 同輪更新唯一 250 主表受影響 ID 與證據；Public 只留可安全公開的 PR／SHA／CI/Pages 摘要。

## Vx.x.xxx 與不可刪除的證據

`.github/workflows/sr-push-version.yml` 每次分支 push 形成新且不可重用的 `Vx.x.xxx` Git tag。這只證明 push，不是 Release、Pages 部署或音訊驗收。線上版本需 Pages 成功部署的 main SHA；Private 研究分支新版本不得宣稱已公開。

SOURCE [#161](https://github.com/ureia-dev/SOURCERUNE/pull/161)／PREVIEW [#35](https://github.com/ureia-dev/SOURCERUNE-PREVIEW/pull/35) **2026-10-14 已關閉且未合併**；CSS 是非必要微調，`PLAY_POINTER_EVENT_NOT_DELIVERED` 失敗原因未證實，不能把關閉解讀成修好了播放音訊，若有實際用戶問題仍由 SOURCE Issue #126 追蹤。同日 SOURCE #68 舊 Mac／Windows Release PR 因未驗收與 merge 衝突關閉，Native 建置需求仍由 Private SOURCE CROSS-08 追蹤。舊 `.github/workflows/original-web-port.yml` 是一次性歷史搬運工具，不是私人 SOURCE 自動鏡像。

整理舊分支／PR 前需查 merge 狀態及是否有唯一未合併差異；不可為了整潔刪除 Approved REF、保密邊界、核准 manifest、rollback／source checkpoint 或未完成研究。
