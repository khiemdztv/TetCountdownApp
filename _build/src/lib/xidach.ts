import { type Card } from './cards';
export function xiScore(cards:Card[]):number {
  let total=cards.reduce((n,c)=>n+(c.rank===14?1:Math.min(c.rank,10)),0);
  if(cards.some(c=>c.rank===14)&&total+10<=21)total+=10;
  return total;
}
export function xiKind(cards:Card[]):{level:number;label:string;score:number} {
  const score=xiScore(cards);
  if(cards.length===2&&cards.every(c=>c.rank===14))return {level:5,label:'XÌ BÀN',score};
  if(cards.length===2&&score===21)return {level:4,label:'XÌ DÁCH',score};
  if(score>21)return {level:0,label:'QUẮC',score};
  if(cards.length===5)return {level:3,label:'NGŨ LINH',score};
  return {level:score>=16?2:1,label:`${score} Điểm`,score};
}
export function xiCompare(player:Card[],dealer:Card[]):number {
  const a=xiKind(player),b=xiKind(dealer);
  if(a.level===0&&b.level===0)return -1;
  if(a.level!==b.level)return Math.sign(a.level-b.level);
  return a.level===3?Math.sign(b.score-a.score):a.level>=4?0:Math.sign(a.score-b.score);
}
export const xiCanStand=(cards:Card[])=>xiScore(cards)>=16||xiKind(cards).level>=3;
