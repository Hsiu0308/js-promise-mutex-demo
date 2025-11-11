# JavaScript Promise Mutex 範例 (js-promise-mutex-demo)

[![JavaScript](https://img.shields.io/badge/JavaScript-ESNext-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript)

這是一個使用原生 JavaScript Promise 鏈來實作 **Mutex (互斥鎖)** 的範例，用以解決在 `async/await` 並行環境中常見的「**競爭條件**」 (Race Condition) 問題。

## 🎯 專案目標

在 JavaScript 中，`Promise.all` 允許我們「同時」 (concurrently) 執行多個非同步任務。

然而，如果這些任務需要共用同一個資源（例如一個 `balance` 變數），並對其執行「讀取-修改-寫回」操作，就極有可能發生**競爭條件**：

1.  任務 A 讀取 `balance` (值為 0)。
2.  任務 B 在任務 A 寫回前，也讀取 `balance` (值**仍為 0**)。
3.  任務 A 計算 `0 + 50` 並寫回 50。
4.  任務 B 計算 `0 + 50` 並寫回 50。

**結果：** 執行了兩次操作，但餘額只增加了 50，而不是 100。

此專案的 `AsyncAccount` 類別展示瞭如何使用 Promise 鏈來建立一個「隊列」，強制所有交易依序執行，從而保證資料的**一致性 (Consistency)**。

## 💡 解決方案：Promise 鏈 Mutex

`AsyncAccount` 類別將 `balance` 狀態和一個 `mutex` 變數封裝起來。

1.  **初始化:** `mutex` 被初始化為一個「已完成」的 Promise (`Promise.resolve()`)，代表「鎖」目前是可用的。
2.  **鎖定與排隊:** 當 `processTransaction` 被呼叫時，它會：
    - 將其核心操作 (一個 `async` 函式) 附加 (chain) 到**目前**的 `this.mutex.then(...)` 上。
    - **立即**將 `this.mutex` 變數更新為這個 `.then()` 所回傳的**新 Promise**。
3.  **依序執行:**
    - 當下一個 `processTransaction` 呼叫進來時，它會將自己的工作附加到「前一個任務」的 Promise 尾端，形成一條 Promise 鏈。
    - 這確保了 `loadBalance` -> `saveBalance` 之間的「關鍵區域」(Critical Section) 絕對不會有兩個任務同時執行。

```javascript
// 關鍵的 Mutex 實作
async processTransaction(itemName, amount) {
  // 關鍵：將此操作鏈接到前一個操作的 Promise 之後
  // 並立即更新 mutex，讓下一個操作排隊
  this.mutex = this.mutex
    .then(async () => {
      // --- 關鍵操作開始 (受 Mutex 保護) ---
      const currentBalance = await this.#loadBalance();
      console.log(`[${itemName}] 交易前，金額為: $${currentBalance}`);

      const newBalance = currentBalance + amount;

      await this.#saveBalance(newBalance);
      console.log(`[${itemName}] 交易後，金額為: $${newBalance}`);
      // --- 關鍵操作結束 ---
    })
    .catch((e) => {
      console.error(`[${itemName}] 交易失敗:`, e);
    });

  return this.mutex;
}
```

## ✨ 此範例展示的關鍵能力

- **非同步程式設計:** `async/await` 和 `Promise.all` 的實際應用。
- **競爭條件 (Race Condition):** 清楚地重現並解決一個經典的並行 (Concurrency) 問題。
- **互斥鎖 (Mutex):** 實作了一個輕量級、不需外部函式庫的 Mutex。
- **Promise 鏈 (Promise Chaining):** 展示了 `.then()` 的鏈式調用如何被用來精確控制執行順序。
- **物件導向 (OOP):** 使用 `class` 進行狀態封裝 (`balance`, `mutex`)，提供清晰的 API (`processTransaction`)。
- **ESNext 語法:** 使用 `class` 私有欄位 (`#loadBalance`) 來保護內部狀態。

## 🚀 如何運行

1.  確保你已安裝 Node.js (v14 或更高版本)。
2.  在你的終端機 (terminal) 中執行：

```bash
node mutex.js
```

### 範例輸出

你將會看到所有交易**依序執行**，並且最終餘額是正確的（$270）。

```
帳戶已建立，初始金額: $0
[賣葡萄] 交易前，金額為: $0
[賣葡萄] 交易後，金額為: $50
[賣橄欖] 交易前，金額為: $50
[賣橄欖] 交易後，金額為: $100
[賣橄欖] 交易前，金額為: $100
[賣橄欖] 交易後，金額為: $150
[賣葡萄] 交易前，金額為: $150
[賣葡萄] 交易後，金額為: $200
[買肥料] 交易前，金額為: $200
[買肥料] 交易後，金額為: $170
[賣葡萄] 交易前，金額為: $170
[賣葡萄] 交易後，金額為: $220
[賣葡萄] 交易前，金額為: $220
[賣葡萄] 交易後，金額為: $270
---
所有交易完成，最終帳戶金額是: $270
```
