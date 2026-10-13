# SOURCERUNE-PREVIEW — 公開 UI 倉庫協作者必讀

> **2026-10-13 正式更新／優先於以下舊版「Public 沒有 DSP」敘述**：本公開倉庫已有經 SOURCE 逐項驗證、獨立 SHA 白名單批准的 **SRC_001～SRC_017 實驗性 Native 同源 C++→WASM 編譯檔**（來源 PRIVATE SOURCE `6cf8bc3c82aaea52a7affcb6d5e2d4d9be716923`），以及共用 HPF／三段 EQ。公開 Web `Web/App/audio/public-dsp-manifest.json` 必須列出精確 17 個 `SRC_...` ID、實驗狀態、編譯 binary SHA256 和零項 Factory 驗收，且與 `scripts/check_public_dsp_release.py` **事先存在於可信 main** 的固定摘要完全一致。唯一可使用的公開音訊端點是原本的 `Web/App/`（UI_01／UI_02 同步）。此種已編譯 WASM **任何訪客都可下載／逆向分析**，不是保密技術；本例外只限被核准的確切二進位檔與薄 AudioWorklet，**不授權**把任何私有 C++、研究文件、預設配方、其他 233 款未驗收模型、完整資料庫及秘密上傳，也不表示 17 款已校準或 VST3 Host 驗收。以後新增來源／換 binary，必須另行審核與固定 SHA、Native/WASM／真瀏覽器音訊 Gate，仍採 SOURCE＋PREVIEW＋KNOWLEDGE 同輪追蹤。


> 此倉為 **Public**，只允許經核准的 Web UI 外觀、操作、可公開圖資與部署檔案。本檔為可公開的**安全摘要**；正式的三倉協作細節與研發規範僅在已授權的 Private KNOWLEDGE 倉庫提供。與使用者溝通使用繁體中文。

## UI 更新必須同輪同步安全 Web 預覽（SR-20261011-UI-WEB-SAME-BATCH；2026-10-11）

**以後所有 UI_01／UI_02／Common Runtime／旋鈕／圖資／文字／控制與材質修改，SOURCE 原版 Web 開發的同一批次，必須同步修改本 Public PREVIEW 的安全原版 UI**；不能再把公開網頁延後好幾輪，不能另畫第二份假 UI。開工先檢查三倉最新 HEAD／進行中 PR／CI，使用同一 Work ID；每批依複雜度集中 10～50 個相關細節，分組 commit、原則上本倉只推送一次，完成後以真實 Web 截圖核對 UI_01／UI_02 操作與比例。

**安全條件高於同步速度**：Public commit／PR 建立前必須確認來源 SOURCE SHA、逐檔 allowlist、Git blob/hash 與公開資料安全；只允許已核准可公開的原始 HTML/CSS/GUI/PNG，聲音路徑要以最小方式停用並明示，**不准複製 DSP／C++、WASM、AudioWorklet／processor.js、私人 Preset、研究與秘密資訊，也不得全量 mirror Private SOURCE**。Common 美術仍在審核者禁止提前傳到此 Public 倉庫；安全檢查不通過時本倉註記 `BLOCKED: PUBLIC ALLOWLIST`，停止公開推送，不以 SOURCE 已完成冒稱 PREVIEW 同步。

**每批完成條件**：SOURCE Web 與 PREVIEW 對應分支／PR、來源 SHA、可公開檔案差異清單、安全檢查、必要 Fast、一次真 Chromium 圖與可操作狀態；未通過則 `PARTIAL/PENDING`。Native UI 未真 Host 驗收也不得聲稱 parity。使用者說「修改／繼續」即同批做安全 Web 候選，只有說「部署」才合併／正式更新 Pages；不得以同步命令擅自新增 Release、壓力測試或更改私人 DSP。正式私人規則是 `SR-CROSS-REPO-SYNC` 第 3A 節；本檔只保存可公開摘要。

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

## 2026-10-12 新規則：同步 PRIVATE 工作總表（PUBLIC 安全摘要）

使用者要求全專案以 Private KNOWLEDGE 的 `SR-DSP-250-MASTER` 為唯一持續更新工作總表，包含 DSP 250 項、11 個共用引擎及 UI／美術／Web／Native／Factory／CI 的真實進度。**本 Public PREVIEW 有新增、修正、刪除、重新部署 UI／圖資／互動時，除原有 SOURCE＋PREVIEW 同批作業外，也必須由有授權的協作者在 PRIVATE KNOWLEDGE 同輪更新對應工作進度／缺口／PR／SHA／驗收。**沒有權限則標 `TRACKER UPDATE PENDING` 並通知來源工作者，不得謊稱已同步。

**公開防洩漏不變**：這裡僅保留穩定工作表 ID、DONE/PENDING/NO CHANGE，絕不貼進私有 DSP 機制、250 項研究內文、音訊程式、內部測試數據或私人總表原文。未部署任何自動 webhook，這是每次交付的必要流程。

## 2026-10-12 Web 真音訊與 Private DSP 同源同步（公開安全摘要）

正式音訊產品以 **Private SOURCE 的 C++ Native VST3 與同源 WASM＋AudioWorklet Web TEST** 為雙主線。每個聲音功能必須逐項驗證一致性，只有真實測試通過才能稱 1:1；**Public PREVIEW 仍僅提供核准 UI 子集，沒有私人 DSP 播放能力**，不可以用假音效／假 Meter 取代。已授權協作者需要聽真正 Web 音訊時，從 Private SOURCE 的既有 GitHub Actions `private-dsp-web-audition.yml` 下載私人試聽成品，以 localhost／安全私有預覽開啟；絕不可為了「同批同步」將 C++、WASM 或 AudioWorklet 放進本公開倉庫。公開版的音訊功能除非經逐檔安全審查及使用者**另行明確批准發布該音訊實作**，否則狀態保持 `AUDIO PRIVATE / UI ONLY`。所有音訊修改同輪更新 Private KNOWLEDGE 工作總表；本倉只記安全 UI 同步或 `NO CHANGE — PRIVATE AUDIO`。工作單：`SR-20261012-WEB-AUDIO-PARITY`。

## 2026-10-12 Public Web 音訊測試入口（限無機密第一階段）

使用者再次明確指定 **SOURCERUNE-PREVIEW 的既有 GitHub Pages** 為唯一日常線上音訊測試入口；不得以 Codespaces、ZIP、本地測試包或另一個網站替代。當前安全第一階段允許以瀏覽器 Web Audio API 播放使用者選取的本機 WAV 原音、提供真實 IN/OUT meter 和 spectrum，並清楚標示 **DRY ONLY / DSP NOT CONNECTED**。不准把這種原音試播、GainNode passthrough、顯示圖形或 UI 旋鈕視為 1:1 DSP、或冒稱所有場景能處理聲音。

**私有 DSP 發布審核仍適用**：要讓此同一 Pages 網址真正跑 SOURCE 的 C++ DSP，須另外審核欲公開的**確切** WASM 與 processor/parameter mapping、模型進度、可下載／逆向風險、授權及逐檔 allowlist；在未取得對該確切可公開產物的明確核准、真實驗證前不得傳入 PUBLIC 倉庫或 PR。不能以本段的「網頁測試入口」選址決議，替代對完整聲音實作公開的授權。獨立 Work ID `SR-20261012-PREVIEW-AUDIO-ENTRY`；未合併 PR 只算候選，不得冒稱 Pages 已部署。三倉 SOURCE 的音效／UI 不因這份文件改變，KNOWLEDGE 記錄各 gate。

## 2026-10-12 公開 Web Audio EQ 實際運算（SR-20261012-PREVIEW-AUDIO-ENTRY）

同一個現有 PREVIEW 網頁可使用瀏覽器標準 `BiquadFilterNode` 做公開可驗證的 **HPF、LPF、三段 Bell EQ**，並讓 Input/Output Gain、Mix、EQ/Global Bypass 與音檔播放真正影響聲音；必須清楚標示這只是 PUBLIC WEB EQ，**不是**從 Private SOURCE 複製的 C++／WASM DSP，與 VST3 並非 bit-exact parity。SOURCE、TRANSMISSION、COVER、MOTION、SPACE、AMBIENCE 等物理／場景模型尚未接入，不可把改動聲音的通用 EQ 當作具名 250 種效果已完成。

發布門檻不變：仍禁止上傳私人 C++、WASM、AudioWorklet、機密 Preset／參數配方；不新增安全壓力測試回合。先以 PR 最小 CI 與真瀏覽器檢查，再經正式合併與 Pages 部署，並於 KNOWLEDGE 紀錄 SHA、支持／不支持範圍與真聽感驗收。
