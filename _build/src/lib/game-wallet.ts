export const INITIAL_XU = 1000;
export const REWARD_XU = 1000;
export const REWARD_INTERVAL = 5 * 60 * 60 * 1000;
const MAX_XU = Number.MAX_SAFE_INTEGER;
type Hold = { stake: number; payout: number | null };
type SavedWallet = { schema: 1; balance: number; rewardAt: number; holds: Record<string, Hold>; rounds: Record<string, unknown> };
export type WalletView = { ready: boolean; balance: number; nextRewardAt: number; error: string | null };
export type WalletStorage = { read: () => Promise<string | null>; write: (value: string) => Promise<void> };
const validXu = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
export class GameWallet {
  private data: SavedWallet | null = null;
  private view: WalletView = { ready: false, balance: 0, nextRewardAt: 0, error: null };
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  constructor(private storage: WalletStorage, private clock = () => Date.now()) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.view;
  private emit() {
    this.view = { ready: !!this.data, balance: this.data?.balance ?? 0, nextRewardAt: (this.data?.rewardAt ?? 0) + REWARD_INTERVAL, error: this.view.error };
    this.listeners.forEach(fn => fn());
  }
  private save() {
    this.emit();
    const value = JSON.stringify(this.data);
    this.writes = this.writes.then(async () => {
      try { await this.storage.write(value); this.view.error = null; }
      catch { this.view.error = 'Chưa lưu được ví Xu. Kiểm tra quyền ghi thư mục app.'; }
      this.emit();
    });
  }
  async initialize() {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const raw = await this.storage.read();
      const value = raw ? JSON.parse(raw) : { schema: 1, balance: INITIAL_XU, rewardAt: this.clock(), holds: {}, rounds: {} };
      if (value.schema !== 1 || !validXu(value.balance) || !validXu(value.rewardAt) || !value.holds || Array.isArray(value.holds) || typeof value.holds !== 'object' || !value.rounds || Array.isArray(value.rounds) || typeof value.rounds !== 'object') throw new Error('Dữ liệu ví Xu không hợp lệ. Không ghi đè số dư đã lưu.');
      for (const hold of Object.values(value.holds) as Hold[]) {
        if (!validXu(hold.stake) || hold.payout !== null && !validXu(hold.payout)) throw new Error('Dữ liệu xu đang đặt không hợp lệ.');
        value.balance = Math.min(MAX_XU, value.balance + (hold.payout ?? hold.stake));
      }
      value.holds = {};
      this.data = value;
      this.refresh();
      this.save();
      await this.flush();
    })();
    return this.loading;
  }
  refresh() {
    if (!this.data) return;
    const count = Math.floor((this.clock() - this.data.rewardAt) / REWARD_INTERVAL);
    if (count > 0) {
      this.data.balance = Math.min(MAX_XU, this.data.balance + count * REWARD_XU);
      this.data.rewardAt += count * REWARD_INTERVAL;
      this.save();
    }
  }
  private ready() {
    if (!this.data) throw new Error('Ví Xu chưa sẵn sàng.');
    this.refresh();
    return this.data;
  }
  reserve(id: string, amount: number) {
    const data = this.ready(), hold = data.holds[id];
    if (this.view.error || !validXu(amount) || !amount || data.balance < amount || hold?.payout != null) return false;
    data.balance -= amount;
    data.holds[id] = { stake: (hold?.stake ?? 0) + amount, payout: null };
    this.save(); return true;
  }
  refund(id: string, amount: number) {
    const data = this.ready(), hold = data.holds[id];
    if (!hold || hold.payout !== null || !validXu(amount) || amount > hold.stake) return false;
    hold.stake -= amount; data.balance += amount;
    if (!hold.stake) delete data.holds[id];
    this.save(); return true;
  }
  commit(id: string, payout: number) {
    const data = this.ready(), hold = data.holds[id];
    if (!hold || hold.payout !== null || !validXu(payout)) return false;
    hold.payout = payout; this.save(); return true;
  }
  release(id: string) {
    const data = this.ready(), hold = data.holds[id];
    if (!hold) return;
    data.balance = Math.min(MAX_XU, data.balance + (hold.payout ?? hold.stake));
    delete data.holds[id]; this.save();
  }
  readRound<T>(id: string): T | null { if (!this.data) throw new Error('Ví Xu chưa sẵn sàng.'); return (this.data.rounds[id] as T) ?? null; }
  writeRound(id: string, state: unknown, delta = 0) {
    const data = this.ready();
    if (this.view.error || !Number.isSafeInteger(delta) || data.balance + delta < 0 || data.balance + delta > MAX_XU) return false;
    data.balance += delta; data.rounds[id] = state; this.save(); return true;
  }
  async flush() { await this.writes; if (this.view.error) throw new Error(this.view.error); }
}
