// 模擬非同步延遲
const randomDelay = () => {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
};

// 建立一個「非同步安全」的帳戶

class AsyncAccount {
  constructor(initialBalance = 0) {
    this.balance = initialBalance;
    this.mutex = Promise.resolve();
    console.log(`帳戶已建立，初始金額: $${this.balance}`);
  }

  // 模擬非同步讀取
  async #loadBalance() {
    await randomDelay();
    return this.balance;
  }

  // 模擬非同步儲存
  async #saveBalance(value) {
    await randomDelay();
    this.balance = value;
  }

  /**
   * 執行一筆交易 (讀取-修改-寫回)
   * @param {string} itemName - 交易項目名稱
   * @param {number} amount - 交易金額 (可正負)
   */

  async processTransaction(itemName, amount) {
    this.mutex = this.mutex
      .then(async () => {
        const currentBalance = await this.#loadBalance();
        console.log(`[${itemName}] 交易前，金額為: $${currentBalance}`);

        const newBalance = currentBalance + amount;

        await this.#saveBalance(newBalance);
        console.log(`[${itemName}] 交易後，金額為: $${newBalance}`);
      })
      .catch((e) => {
        console.error(`[${itemName}] 交易失敗:`, e);
      });

    return this.mutex;
  }

  async getFinalBalance() {
    return this.mutex.then(async () => {
      return this.balance;
    });
  }
}

async function main() {
  const myAccount = new AsyncAccount(0);

  await Promise.all([
    myAccount.processTransaction("賣葡萄", 50), // +50
    myAccount.processTransaction("賣橄欖", 50), // +50
    myAccount.processTransaction("賣橄欖", 50), // +50
    myAccount.processTransaction("賣葡萄", 50), // +50
    myAccount.processTransaction("買肥料", -30), // -30
    myAccount.processTransaction("賣葡萄", 50), // +50
    myAccount.processTransaction("賣葡萄", 50), // +50
  ]);

  // 7 筆交易: 50*6 - 30 = 270
  const finalBalance = await myAccount.getFinalBalance();
  console.log(`---`);
  console.log(`所有交易完成，最終帳戶金額是: $${finalBalance}`);
}

main();
