export type Card = { id: number; rank: number; suit: number };
export const SUITS = ['♠', '♣', '♦', '♥'];
export const SUIT_NAMES = ['bích', 'tép', 'rô', 'cơ'];
export const rankLabel = (rank: number) => ({11:'J',12:'Q',13:'K',14:'A'}[rank] ?? String(rank));
export const cardLabel = (c: Card) => `${rankLabel(c.rank)} ${SUIT_NAMES[c.suit]}`;
export const strength = (c: Card) => (c.rank === 2 ? 15 : c.rank) * 4 + c.suit;
export const sortCards = (cards: Card[]) => [...cards].sort((a,b) => strength(a)-strength(b));
export function deck(random: () => number = Math.random): Card[] {
  const cards = Array.from({length:52},(_,id)=>({id,rank:2+Math.floor(id/4),suit:id%4}));
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1)); const a=cards[i],b=cards[j];if(a&&b){cards[i]=b;cards[j]=a;}}
  return cards;
}
export const pokerCode = (c: Card) => `${c.rank===14?'A':c.rank===13?'K':c.rank===12?'Q':c.rank===11?'J':c.rank===10?'T':c.rank}${['s','c','d','h'][c.suit]}`;
