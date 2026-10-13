import { useEffect, useState } from 'react';
import { Plus, Hand, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { type Card, deck } from '../../lib/cards';
import { xiKind, xiCompare, xiCanStand } from '../../lib/xidach';
import { CardTable, PlayingCard, Seat, CardCelebration } from './PlayingCard';
import { gameWallet, useGameWallet } from './game-wallet';
import type { GameSound } from './game-audio';
type XiRound = { bet: number; player: Card[]; dealer: Card[]; remaining: Card[]; phase: 'bet'|'play'|'dealer'|'done'; message: string; won: boolean };
const fresh: XiRound = {bet:50,player:[],dealer:[],remaining:[],phase:'bet',message:'Chọn Xu may mắn',won:false};
function settlement(round: XiRound) {
 const comparison=xiCompare(round.player,round.dealer);
 return {round:{...round,phase:'done' as const,won:comparison>0,message:comparison>0?`Lộc đến! +${round.bet} Xu`:comparison===0?'Hòa bài · hoàn Xu':'Nhà Cái thắng'},returned:comparison>0?round.bet*2:comparison===0?round.bet:0};
}
export function XiDach({playSound,motion}:{playSound:(k:GameSound)=>void;motion:boolean}){
 const funds=useGameWallet(),wallet=funds.balance;
 const [state,setState]=useState<XiRound>(()=>gameWallet.readRound<XiRound>('xi')??fresh);
 const {bet,player,dealer,remaining,phase,message,won}=state;
 const update=(next:XiRound,delta=0)=>{if(gameWallet.writeRound('xi',next,delta)){setState(next);return true;}return false;};
 const finish=(next:XiRound)=>{
   if(gameWallet.readRound<XiRound>('xi')?.phase==='done')return;
   const result=settlement(next);
   if(update(result.round,result.returned))playSound(result.round.won?'win':'chip');
 };
 const start=()=>{
   const saved=gameWallet.readRound<XiRound>('xi');
   if(saved&&saved.phase!=='bet'&&saved.phase!=='done'||wallet<bet)return;
   const d=deck(),p=d.slice(0,2),house=d.slice(2,4);
   const next:XiRound={bet,player:p,dealer:house,remaining:d.slice(4),phase:'play',message:'Rút thêm hay dằn?',won:false};
   if(xiKind(p).level>=4||xiKind(house).level>=4){
     const result=settlement(next);
     if(update(result.round,-bet+result.returned))playSound(result.round.won?'win':'chip');
   } else if(update(next,-bet))playSound('stone');
 };
 const hit=()=>{
   const c=remaining[0];if(!c||phase!=='play')return;
   const p=[...player,c],next={...state,player:p,remaining:remaining.slice(1)};
   playSound('stone');
   if(xiKind(p).level===0)finish(next);
   else update({...next,phase:p.length===5?'dealer':'play'});
 };
 useEffect(()=>{
   if(phase!=='dealer')return;
   const timer=setTimeout(()=>{
     if(xiKind(dealer).level<3&&xiKind(dealer).score<17){
       const c=remaining[0];
       if(c){update({...state,dealer:[...dealer,c],remaining:remaining.slice(1)});playSound('stone');return;}
     }
     finish(state);
   },motion?600:100);
   return()=>clearTimeout(timer);
 },[state,motion]);
 const kind=xiKind(player);
 return <div className="premium-card-game xi-game"><header className="card-game-header"><div><span className="game-kicker">ĐINH MÙI 2027 · LỘC ĐẦU NĂM</span><h2>Xì Dách</h2></div><div className="card-wallet">🧧 {wallet.toLocaleString('vi-VN')} Xu</div></header><CardTable className="xi-table"><Seat name="Nhà Cái" position="top" status={phase==='done'?xiKind(dealer).label:'Dê vàng giữ lộc'}/><div className="dealer-hand">{dealer.length?dealer.map((c,i)=><PlayingCard key={c.id} card={i===1&&(phase==='play'||phase==='bet')?undefined:c}/>):<><PlayingCard/><PlayingCard/></>}</div><div className="xi-table-center"><span className="table-inscription">❀ XUÂN AN KHANG ❀</span><div className="coin-stack">🧧 <span>◉ ◉ ◉</span></div><strong>{bet} Xu</strong><p role="status">{message}</p></div><div className="xi-player-hand"><div className={`xi-score ${kind.level>=3?'xi-special':''}`}>{player.length?kind.label:'Chờ chia bài'}</div><div>{player.map(c=><PlayingCard key={c.id} card={c}/>)}</div></div><Seat name="Bạn" position="bottom-left" coins={wallet}/></CardTable>
 <footer className="card-actions xi-actions">{phase==='bet'||phase==='done'?<><div className="bet-coins">{[10,50,100,500].map(n=><Button variant="ghost" className={bet===n?'bet-selected':''} key={n} disabled={wallet<n} aria-pressed={bet===n} onClick={()=>{update({...state,bet:n});playSound('chip');}}>{n}</Button>)}</div><Button className="gold-action" disabled={wallet<bet} onClick={start}><Play/>{phase==='done'?'Ván mới':'Chia bài'}</Button></>:<><span>{phase==='dealer'?'Nhà Cái đang rút…':`${kind.score} điểm`}</span><Button variant="outline" disabled={phase!=='play'||player.length>=5} onClick={hit}><Plus/>Rút bài</Button><Button className="gold-action" disabled={phase!=='play'||!xiCanStand(player)} onClick={()=>{update({...state,phase:'dealer'});playSound('chip');}}><Hand/>Dằn</Button></>}</footer><CardCelebration show={won} motion={motion}/></div>;
}
