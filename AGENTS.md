# SOURCERUNE-PREVIEW — 公開 UI 倉庫協作者必讀

> 此倉為 **Public**，只允許經核准的 Web UI 外觀、操作、可公開圖資與部署檔案。本檔為可公開的**安全摘要**；正式的三倉協作細節與研發規範僅在已授權的 Private KNOWLEDGE 倉庫提供。與使用者溝通使用繁體中文。

## 三倉一起推進，但絕不混淆權限

- **SOURCERUNE（Private）**：唯一正式 Native VST3、完整 Web、UI_01／UI_02、DSP／WASM／AudioWorklet／REF 來源。先在正式原版程式實作及驗證。
- **SOURCERUNE-PREVIEW（本倉，Public）**：同步核准可公開的**原版 Web UI** 與圖片，保留相對路徑、樣式、交互行為、來源 commit 與 SHA，不再重畫第二套 UI。
- **SOURCERUNE-KNOWLEDGE（Private）**：保存正式核准要求、研究、內部工作單、來源、版本對照和每次跨倉驗收紀錄。

**每個任務必須檢查三倉**；使用 `SR-YYYYMMDD-主題` Work ID，開始前重讀三倉 main/工作 branch/open PR/CI/Pages 和最後成功 checkpoint，必要時由有權限的協作者讀私人規範。改動相關的倉庫盡量同輪提交／驗收；不需變動的倉庫記 `NO CHANGE — 原因`；未完成／缺權限寫 `PENDING` 或 `BLOCKED`，**不能聲稱已三倉同步**。

## Public Preview 嚴格禁止事項

1. 禁止上傳／複製 C++ DSP、音訊引擎的實作、WASM、AudioWorklet／processor.js、私人 Preset 參數配方、內部研究資料、密鑰或本來只在 Private 中的 Git 歷史。
2. **禁止把 PRIVATE SOURCE 直接整倉 mirror 到此**。使用明確 allowlist、安全審核、核准公開的 HTML/CSS/UI JavaScript／PNG，記錄來源 blob SHA；正式入口 `Web/App/index.html` 直接沿用 SOURCE 原版 UI。需要修改音訊耦合時只做最小無音訊隔離，不另造旋鈕或卡片。
3. SOURCE 已 Private：舊 `.github/workflows/original-web-port.yml` 是固定公開 SHA 的**歷史一次性搬移工具**，不能拿來持續自動拉 Private 倉庫，也不能新增未審核 token／秘密憑證。
4. 公開版不執行 DSP：PLAY、音訊前後 Meter、實際 Spectrum 輸出無真音訊能力。不可宣稱與私人完整版聲音功能 1:1；UI 檔案 SHA／靜態部署成功也不等於匿名瀏覽器實際點擊驗收。
5. 先建單目的 branch/PR，在 PR **公開前就檢查安全輸出**；通過既有最小測試、來源 SHA、allowlist／防洩漏 gate 和 Pages，再更新私人跨倉記錄。發現高風險內容立即停止，不公開 PR／commit。不能因為同步要求就擅自調高壓力／安全測試次數。

## 每次 PR 必報

Work ID、SOURCE 的私人開發 checkpoint（只記必要短 SHA／不公開機密）、本 PREVIEW branch／PR／commit／CI／Pages、KNOWLEDGE 的同步狀態（僅標 DONE/PENDING/NO CHANGE）、來源 allowlist／SHA、安全 gate、純 UI 可操作狀態、尚未驗收事項及下一步。

**本倉只要 Public PR，協作者就必須假設 PR 內容、commit、log 與產物全世界都可能閱讀。**
