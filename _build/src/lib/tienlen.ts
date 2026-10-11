import { type Card, deck, sortCards, strength } from './cards';
export type Combo = { kind:'single'|'pair'|'triple'|'four'|'straight'|'pairs'; size:number; high:number; rank:number };
export function combination(cards:Card[]):Combo|null {
  if(!cards.length)return null;
  const s=sortCards(cards), last=s[s.length-1];if(!last)return null;
  const ranks=s.map(c=>c.rank===2?15:c.rank), high=strength(last), size=s.length;
  if(size<=4&&ranks.every(r=>r===ranks[0]))return {kind: size===1?'single':size===2?'pair':size===3?'triple':'four',size,high,rank:last.rank};
  if(size>=3&&!ranks.includes(15)&&ranks.every((r,i)=>i===0||r===(ranks[i-1]??0)+1))return {kind:'straight',size,high,rank:last.rank};
  if(size>=6&&size%2===0&&!ranks.includes(15)&&ranks.every((r,i)=>i%2===1?r===ranks[i-1]:i===0||r===(ranks[i-2]??0)+1))return {kind:'pairs',size,high,rank:last.rank};
  return null;
}
export function beats(cards:Card[], pile:Card[]):boolean {
  const a=combination(cards),b=combination(pile);if(!a)return false;if(!b)return true;
  if(a.kind===b.kind&&a.size===b.size)return a.high>b.high;
  if(b.rank===2&&(b.kind==='single'||b.kind==='pair'))return a.kind==='four'||(a.kind==='pairs'&&a.size>=(b.kind==='pair'?8:6));
  if(b.kind==='pairs'&&b.size===6)return a.kind==='four'||(a.kind==='pairs'&&a.size>=8);
  return b.kind==='four'&&a.kind==='pairs'&&a.size>=8;
}
export function whiteWin(hand:Card[]):string|null {
  if(hand.length!==13)return null;
  const counts=new Map<number,number>();hand.forEach(c=>counts.set(c.rank,(counts.get(c.rank)??0)+1));
  if(counts.get(2)===4)return 'Tứ quý 2';
  if(Array.from({length:12},(_,i)=>i+3).every(r=>counts.has(r)))return 'Sảnh rồng';
  if([...counts.values()].reduce((n,c)=>n+Math.floor(c/2),0)>=6)return 'Sáu đôi';
  for(let r=3;r<=10;r++)if(Array.from({length:5},(_,i)=>r+i).every(x=>(counts.get(x)??0)>=2))return 'Năm đôi thông';
  return null;
}
export type TienState={hands:Card[][];player:number;pile:Card[];leader:number;passed:number[];first:boolean;winner:number|null;white:string|null;log:string};
export function createTien():TienState {
  const d=deck(),hands=Array.from({length:4},(_,i)=>sortCards(d.slice(i*13,i*13+13)));
  const winner=hands.findIndex(h=>whiteWin(h));
  const first=hands.findIndex(h=>h.some(c=>c.rank===3&&c.suit===0));
  return {hands,player:first,pile:[],leader:first,passed:[],first:true,winner:winner<0?null:winner,white:winner<0?null:whiteWin(hands[winner]??[]),log:'Ván mới · 3 bích đi trước'};
}
export function tienMove(s:TienState,ids:number[]|null):TienState {
  if(s.winner!==null)return s;
  const hand=s.hands[s.player]??[];
  if(ids===null){
    if(!s.pile.length||s.player===s.leader)return s;
    const passed=[...s.passed,s.player];let next=(s.player+1)%4;while(passed.includes(next))next=(next+1)%4;
    if(next===s.leader)return {...s,player:next,pile:[],passed:[],log:'Vòng mới · tự do ra bài'};
    return {...s,player:next,passed,log:`${s.player===0?'Bạn':['','Mai','Lộc','An'][s.player]} bỏ lượt`};
  }
  if(new Set(ids).size!==ids.length)return s;
  const cards=hand.filter(c=>ids.includes(c.id));
  if(cards.length!==ids.length||!beats(cards,s.pile)||(s.first&&!cards.some(c=>c.rank===3&&c.suit===0)))return s;
  const hands=s.hands.map((h,i)=>i===s.player?h.filter(c=>!ids.includes(c.id)):h);
  let next=(s.player+1)%4;while(s.passed.includes(next))next=(next+1)%4;
  return {...s,hands,pile:sortCards(cards),leader:s.player,player:next,first:false,winner:hands[s.player]?.length===0?s.player:null,log:`${s.player===0?'Bạn':['','Mai','Lộc','An'][s.player]} đánh ${cards.length} lá`};
}
export function tienOptions(s:TienState):Card[][] {
  const hand=s.hands[s.player]??[],out:Card[][]=[];
  for(let mask=1;mask<2**hand.length;mask++){
    const cards=hand.filter((_,i)=>mask&(1<<i));
    if(beats(cards,s.pile)&&(!s.first||cards.some(c=>c.rank===3&&c.suit===0)))out.push(cards);
  }
  return out.sort((a,b)=>s.pile.length?a.length-b.length||(combination(a)?.high??0)-(combination(b)?.high??0):b.length-a.length||(combination(a)?.high??0)-(combination(b)?.high??0));
}
