import solver from 'pokersolver';
import { type Card, deck, pokerCode } from './cards';
export type PokerSeat={cards:Card[];stack:number;paid:number;street:number;folded:boolean;acted:boolean;status:string};
export type PokerState={seats:PokerSeat[];board:Card[];deck:Card[];stage:number;player:number;dealer:number;bet:number;minRaise:number;done:boolean;message:string;winners:number[]};
export const STREETS=['Pre-flop','Flop','Turn','River','Hạ bài'];
export function sidePots(paid:number[],folded:boolean[]):{amount:number;eligible:number[]}[] {
  const levels=[...new Set(paid.filter(p=>p>0))].sort((a,b)=>a-b);let previous=0;
  return levels.map(level=>{const contributors=paid.map((p,i)=>p>=level?i:-1).filter(i=>i>=0),amount=(level-previous)*contributors.length;previous=level;return {amount,eligible:contributors.filter(i=>!folded[i])};});
}
export function pokerAwards(seats:PokerSeat[],board:Card[]):{awards:number[];winners:number[];label:string} {
  const hands=seats.map(s=>solver.Hand.solve([...s.cards,...board].map(pokerCode))),awards=seats.map(()=>0);let label='';
  for(const pot of sidePots(seats.map(s=>s.paid),seats.map(s=>s.folded))){
    if(!pot.eligible.length)continue;
    const candidates=pot.eligible.map(i=>hands[i]).filter((h):h is InstanceType<typeof solver.Hand>=>Boolean(h));
    const winning=solver.Hand.winners(candidates), ids=pot.eligible.filter(i=>{const h=hands[i];return h?winning.includes(h):false;});
    const share=Math.floor(pot.amount/ids.length);let spare=pot.amount-share*ids.length;
    for(const id of ids){awards[id]=(awards[id]??0)+share+(spare-->0?1:0);label=hands[id]?.descr??'';}
  }
  return {awards,winners:awards.map((a,i)=>a>0?i:-1).filter(i=>i>=0),label};
}
export function createPoker(stacks:number[]=[1000,1000,1000,1000,1000],dealer=0):PokerState {
  const d=deck(),seats=stacks.map((stack,i)=>({cards:d.slice(i*2,i*2+2),stack,paid:0,street:0,folded:stack===0,acted:false,status:stack===0?'Hết Xu':''}));
  const live=seats.map((s,i)=>s.stack>0?i:-1).filter(i=>i>=0);
  const next=(id:number)=>{for(let n=1;n<=5;n++){const i=(id+n)%5;if(live.includes(i))return i;}return id;};
  const sb=next(dealer),bb=next(sb);
  for(const [i,amount] of [[sb,10],[bb,20]]){if(i===undefined||amount===undefined)continue;const s=seats[i];if(s){const v=Math.min(amount,s.stack);s.stack-=v;s.paid=v;s.street=v;s.status=amount===10?'SB 10':'BB 20';}}
  return {seats,board:[],deck:d.slice(10),stage:0,player:next(bb),dealer,bet:20,minRaise:20,done:false,message:'Cược nhỏ 10 · cược lớn 20 Xu',winners:[]};
}
function settle(s:PokerState):PokerState {
  const active=s.seats.map((p,i)=>!p.folded?i:-1).filter(i=>i>=0);
  const total=s.seats.reduce((n,p)=>n+p.paid,0);
  if(active.length===1){const win=active[0];if(win===undefined)return s;return {...s,done:true,winners:[win],message:`${win===0?'Bạn':['','Mai','Lộc','An','Phúc'][win]} thắng ${total} Xu`,seats:s.seats.map((p,i)=>i===win?{...p,stack:p.stack+total,status:'Thắng'}:p)};}
  const result=pokerAwards(s.seats,s.board);
  return {...s,done:true,stage:4,winners:result.winners,message:`${result.label} · chia ${total} Xu`,seats:s.seats.map((p,i)=>({...p,stack:p.stack+(result.awards[i]??0),status:(result.awards[i]??0)>0?`+${result.awards[i]} Xu`:p.folded?'Fold':'Hạ bài'}))};
}
function advance(s:PokerState):PokerState {
  if(s.seats.filter(p=>!p.folded).length===1)return settle(s);
  const pending=s.seats.map((p,i)=>!p.folded&&p.stack>0&&(!p.acted||p.street<s.bet)?i:-1).filter(i=>i>=0);
  if(pending.length){for(let n=1;n<=5;n++){const id=(s.player+n)%5;if(pending.includes(id))return {...s,player:id};}}
  if(s.stage>=3)return settle(s);
  const count=s.stage===0?3:1;
  const next={...s,stage:s.stage+1,board:[...s.board,...s.deck.slice(1,count+1)],deck:s.deck.slice(count+1),bet:0,minRaise:20,seats:s.seats.map(p=>({...p,street:0,acted:false,status:p.folded?'Fold':p.stack===0?'All-in':''})),player:s.dealer};
  // With fewer than two funded players, run out the board: no meaningless checks against all-in opponents.
  if(next.seats.filter(p=>!p.folded&&p.stack>0).length<2)return advance({...next,seats:next.seats.map(p=>({...p,acted:true}))});
  return advance(next);
}
export type PokerAction='fold'|'call'|'raise'|'allin';
export function pokerAction(s:PokerState,action:PokerAction,target=0):PokerState {
  if(s.done)return s;
  const p=s.seats[s.player];if(!p||p.folded||!p.stack&&action!=='fold')return s;
  const due=s.bet-p.street;
  if((action==='raise'||action==='allin'&&p.street+p.stack>s.bet)&&p.acted&&p.street<s.bet)return s; // short all-in does not reopen raising; an all-in call is still legal.
  let pay=action==='fold'?0:action==='call'?Math.min(due,p.stack):action==='allin'?p.stack:target-p.street;
  if(action==='raise'&&(target<s.bet+s.minRaise||pay>p.stack||pay<=due))return s;
  if(pay<0)return s;
  const street=p.street+pay,fullRaise=street>=s.bet+s.minRaise,bet=Math.max(s.bet,street);
  const seats=s.seats.map((q,i)=>i===s.player?{...q,stack:q.stack-pay,paid:q.paid+pay,street,folded:action==='fold',acted:true,status:action==='fold'?'Fold':q.stack===pay?'All-in':action==='call'?(due?'Call':'Check'):`Raise ${street}`}:fullRaise&&!q.folded&&q.stack>0?{...q,acted:false}:q);
  return advance({...s,seats,bet,minRaise:fullRaise?street-s.bet:s.minRaise,message:`${s.player===0?'Bạn':['','Mai','Lộc','An','Phúc'][s.player]} · ${seats[s.player]?.status}`});
}
export function pokerBot(s:PokerState):{action:PokerAction;target?:number} {
  const p=s.seats[s.player];if(!p)return {action:'call'};
  const a=p.cards[0],b=p.cards[1],due=s.bet-p.street;
  const strong=s.board.length>=3?solver.Hand.solve([...p.cards,...s.board].map(pokerCode)).rank>=3:Boolean(a&&b&&(a.rank===b.rank||a.rank>=11&&b.rank>=11));
  if(due>Math.max(60,p.stack*.3)&&!strong)return {action:'fold'};
  if(strong&&!p.acted&&p.stack>due+s.minRaise&&Math.random()<.35)return {action:'raise',target:s.bet+s.minRaise};
  return {action:'call'};
}
