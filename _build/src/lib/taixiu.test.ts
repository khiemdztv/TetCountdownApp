import { describe, expect, it } from 'vitest';
import { placeTaiXiu, taiXiuResult, taiXiuReturn, TAI_XIU_CHIPS, TAI_XIU_BALANCE } from './taixiu';
describe('Tài Xỉu', () => {
  it('starts with 1000 virtual Xu', () => expect(TAI_XIU_BALANCE).toBe(1000));
  it('offers 10, 50, 100, 500 and MAX', () => expect(TAI_XIU_CHIPS).toEqual([10,50,100,500,'MAX']));
  it('Xỉu covers non-triple totals from 4 through 10', () => {expect(taiXiuResult([1,1,2]).side).toBe('xiu');expect(taiXiuResult([2,3,5]).side).toBe('xiu');});
  it('Tài covers non-triple totals from 11 through 17', () => {expect(taiXiuResult([2,3,6]).side).toBe('tai');expect(taiXiuResult([5,6,6]).side).toBe('tai');});
  it('all triples lose both regular bets', () => {for(let n=1;n<=6;n++){const r=taiXiuResult([n,n,n]);expect(r.side).toBe('triple');expect(taiXiuReturn({tai:50,xiu:50},r)).toBe(0);}});
  it('pays 1:1 and returns the winning stake', () => expect(taiXiuReturn({tai:100,xiu:50},taiXiuResult([4,4,6]))).toBe(200));
  it('MAX places only the remaining balance', () => expect(placeTaiXiu(950,{tai:0,xiu:50},'tai','MAX')).toEqual({balance:0,bets:{tai:950,xiu:50}}));
  it('rejects bets beyond the wallet', () => {const bets={tai:0,xiu:0};expect(placeTaiXiu(40,bets,'tai',50).bets).toBe(bets);});
  it('validates three six-sided dice', () => {expect(()=>taiXiuResult([0,3,6])).toThrow();expect(()=>taiXiuResult([1,2])).toThrow();});
});