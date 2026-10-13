import { useSyncExternalStore } from 'react';
import { GameWallet } from '../../lib/game-wallet';
const KEY = 'tet-game-wallet-v1';
const native = () => (window as unknown as { Neutralino?: { storage: { getData: (key: string) => Promise<string>; setData: (key: string, value: string) => Promise<void> }; filesystem: { getStats: (path: string) => Promise<unknown> } } }).Neutralino;
export const gameWallet = new GameWallet({
  async read() {
    if (native()) {
      const appPath=(window as unknown as {NL_PATH:string}).NL_PATH;
      try { await native()!.filesystem.getStats(appPath+'/.storage/'+KEY+'.neustorage'); }
      catch (error) { if ((error as {code?:string}).code === 'NE_FS_NOPATHE') return null; throw error; }
      return native()!.storage.getData(KEY);
    }
    return localStorage.getItem(KEY);
  },
  async write(value) {
    if (native()) await native()!.storage.setData(KEY, value);
    else localStorage.setItem(KEY, value);
  }
});
let timer: ReturnType<typeof setInterval> | null = null;
export async function initializeWallet() {
  await gameWallet.initialize();
  if (!timer) timer = setInterval(() => gameWallet.refresh(), 60000);
}
export function useGameWallet() { return useSyncExternalStore(gameWallet.subscribe, gameWallet.getSnapshot); }
