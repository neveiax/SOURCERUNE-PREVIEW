## PRIVATE 主表同步（公開安全狀態）

- [ ] 本次 UI／圖資／互動／部署工作已由授權 SOURCE/KNOWLEDGE 協作者同步至 PRIVATE `SR-DSP-250-MASTER`，或標 `TRACKER UPDATE PENDING`／`NO CHANGE`。
- [ ] 公開 PR 沒有貼入私人 DSP／產品規格／總表原文，只記公開安全的 Work ID、PR/SHA、UI 驗證與進度。

## PUBLIC SOURCERUNE UI Preview — 同步與安全檢查

- **Work ID**: `SR-YYYYMMDD-...`
- **核准的公開 UI 變更內容**:
- **原始 SOURCE（Private）**: 對應工作追蹤 ID／安全可公開的來源 SHA（不貼私有文件正文）
- **PREVIEW（Public）**: branch／commit／PR／Fast CI／Pages
- **KNOWLEDGE（Private）**: `DONE / PENDING / NO CHANGE — 原因`（禁止貼內部工作單與機密）
- **來源原檔 UI parity**: 本次 HTML／CSS／JS／PNG 為何與 SOURCE 一致？若有安全 shim 請列最小差異
- **公開白名單與機密 gate**: 已核准 PNG Git blob SHA／路徑檢查；無 DSP C++、WASM、AudioWorklet、processor.js、私人 Preset recipe、token、研究
- **真正瀏覽器操作驗收**: PASS／PENDING（證據）
- **不涉及真音訊 DSP**: 已核對
- **最後成功 checkpoint、阻塞原因、下一步**:

參考 [公開協作守則](../AGENTS.md)。**不要因「三倉同步」而把任何 Private 倉庫完整 mirror 到 Public。**
