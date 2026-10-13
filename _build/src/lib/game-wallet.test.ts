import { describe, it, expect } from 'vitest';
import { GameWallet, REWARD_INTERVAL } from './game-wallet';
function fixture(raw: string | null = null) {
 let value=raw,now=1000000000;
 const wallet=new GameWallet({read:async()=>value,write:async next=>{value=next;}},()=>now);
 return {wallet,advance:(ms:number)=>{now+=ms;},read:()=>value,restart:()=>new GameWallet({read:async()=>value,write:async next=>{value=next;}},()=>now)};
}
describe('shared persistent Xu wallet',()=>{
 it('starts with 1000 and awards only on full five-hour boundaries',async()=>{
   const f=fixture();await f.wallet.initialize();
   expect(f.wallet.getSnapshot().balance).toBe(1000);
   f.advance(REWARD_INTERVAL-1);f.wallet.refresh();expect(f.wallet.getSnapshot().balance).toBe(1000);
   f.advance(1);f.wallet.refresh();expect(f.wallet.getSnapshot().balance).toBe(2000);
   f.advance(REWARD_INTERVAL*2+1234);f.wallet.refresh();expect(f.wallet.getSnapshot().balance).toBe(4000);
   const next=f.wallet.getSnapshot().nextRewardAt;await f.wallet.flush();
   const again=f.restart();await again.initialize();expect(again.getSnapshot().balance).toBe(4000);expect(again.getSnapshot().nextRewardAt).toBe(next);
 });
 it('adds offline rewards, preserves the partial interval and ignores clock rollback',async()=>{
   const f=fixture();await f.wallet.initialize();f.advance(REWARD_INTERVAL*3+4000);
   const next=f.restart();await next.initialize();expect(next.getSnapshot().balance).toBe(4000);
   f.advance(-REWARD_INTERVAL);next.refresh();expect(next.getSnapshot().balance).toBe(4000);
 });
 it('undo refunds only the stake and never replaces intervening rewards',async()=>{
   const f=fixture();await f.wallet.initialize();expect(f.wallet.reserve('bau',50)).toBe(true);
   f.advance(REWARD_INTERVAL);f.wallet.refresh();expect(f.wallet.refund('bau',50)).toBe(true);
   expect(f.wallet.getSnapshot().balance).toBe(2000);
   expect(f.wallet.reserve('sic',3000)).toBe(false);expect(f.wallet.reserve('sic',-1)).toBe(false);
 });
 it('settles a determined dice result exactly once, including after restart',async()=>{
   const f=fixture();await f.wallet.initialize();f.wallet.reserve('sic',50);f.wallet.commit('sic',100);await f.wallet.flush();
   const again=f.restart();await again.initialize();expect(again.getSnapshot().balance).toBe(1050);
   again.release('sic');await again.flush();const third=f.restart();await third.initialize();expect(third.getSnapshot().balance).toBe(1050);
 });
 it('refunds unfinished dice bets when leaving or restarting',async()=>{
   const f=fixture();await f.wallet.initialize();f.wallet.reserve('bau',500);f.wallet.release('bau');
   expect(f.wallet.getSnapshot().balance).toBe(1000);f.wallet.reserve('sic',50);await f.wallet.flush();
   const again=f.restart();await again.initialize();expect(again.getSnapshot().balance).toBe(1000);
 });
 it('stores a card hand and the balance change in the same snapshot',async()=>{
   const f=fixture();await f.wallet.initialize();f.wallet.writeRound('xi',{phase:'play',bet:50},-50);await f.wallet.flush();
   const again=f.restart();await again.initialize();expect(again.getSnapshot().balance).toBe(950);expect(again.readRound('xi')).toEqual({phase:'play',bet:50});
   again.writeRound('xi',{phase:'done',bet:50},100);await again.flush();expect(JSON.parse(f.read()!).balance).toBe(1050);
 });
 it('keeps write order even when multiple moves queue up',async()=>{
   let saved='',release:()=>void=()=>{},blocked=false;
   const wallet=new GameWallet({read:async()=>null,write:async value=>{if(JSON.parse(value).balance===950&&!blocked){blocked=true;await new Promise<void>(r=>{release=r;});}saved=value;}});
   await wallet.initialize();wallet.reserve('bau',50);wallet.commit('bau',100);wallet.release('bau');
   await new Promise(r=>setTimeout(r,0));release();await wallet.flush();expect(JSON.parse(saved).balance).toBe(1050);
 });
 it('does not overwrite corrupt saved data',async()=>{
   const f=fixture('{"schema":1,"balance":-50}');await expect(f.wallet.initialize()).rejects.toThrow();expect(f.read()).toBe('{"schema":1,"balance":-50}');
 });
});
