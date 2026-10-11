declare module 'pokersolver' {
  class Hand {
    descr: string;
    rank: number;
    static solve(cards: string[]): Hand;
    static winners(hands: Hand[]): Hand[];
  }
  const solver: { Hand: typeof Hand };
  export default solver;
}
