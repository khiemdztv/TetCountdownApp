import { rollDice } from './folk-games';
export type TaiXiuSide = 'xiu' | 'tai';
export type TaiXiuResult = { dice: number[]; total: number; side: TaiXiuSide | 'triple' };
export const TAI_XIU_CHIPS = [10, 50, 100, 500, 'MAX'] as const;
export const TAI_XIU_BALANCE = 1000;
export function taiXiuResult(dice: number[]): TaiXiuResult {
  if (dice.length !== 3 || dice.some(n => !Number.isInteger(n) || n < 1 || n > 6)) throw new Error('Cần ba xúc xắc từ 1 đến 6');
  const total = dice.reduce((a,b) => a+b,0);
  return { dice, total, side: dice.every(n => n === dice[0]) ? 'triple' : total <= 10 ? 'xiu' : 'tai' };
}
export const rollTaiXiu = () => taiXiuResult(rollDice().map(n => n+1));
export function taiXiuReturn(bets: Record<TaiXiuSide, number>, result: TaiXiuResult) {
  return result.side === 'triple' ? 0 : bets[result.side] * 2;
}
export function placeTaiXiu(balance: number, bets: Record<TaiXiuSide, number>, side: TaiXiuSide, chip: number | 'MAX') {
  const amount = chip === 'MAX' ? balance : chip;
  if (!Number.isInteger(amount) || amount <= 0 || amount > balance) return { balance, bets };
  return { balance: balance-amount, bets: {...bets, [side]: bets[side]+amount} };
}