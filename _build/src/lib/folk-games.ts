export const SYMBOLS = ['Bầu', 'Cua', 'Tôm', 'Cá', 'Gà', 'Nai'] as const;
export const CHIPS = [10, 50, 100, 500, 'All-in'] as const;
export const INITIAL_BALANCE = 1000;
export type Bets = number[];
export function placeChip(balance: number, bets: Bets, pit: number, chip: number | 'All-in') {
  const amount = chip === 'All-in' ? balance : chip;
  if (pit < 0 || pit > 5 || amount <= 0 || amount > balance) return { balance, bets };
  return { balance: balance - amount, bets: bets.map((b, i) => i === pit ? b + amount : b) };
}
export function payout(bets: Bets, dice: number[]) {
  return bets.reduce((sum, bet, i) => {
    const matches = dice.filter(d => d === i).length;
    return sum + (matches ? bet * (matches + 1) : 0);
  }, 0);
}
export function rollDice(): number[] {
  // Rejection sampling avoids modulo bias; Xu never represents real money.
  return Array.from({ length: 3 }, () => {
    let n = 255;
    while (n >= 252) n = crypto.getRandomValues(new Uint8Array(1))[0] ?? 255;
    return n % 6;
  });
}
