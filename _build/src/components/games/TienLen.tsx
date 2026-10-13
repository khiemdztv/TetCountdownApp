import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Lightbulb, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '../ui/button';
import { sortCards } from '../../lib/cards';
import { createTien, tienMove, tienOptions, beats } from '../../lib/tienlen';
import { CardTable, PlayingCard, Seat, CardCelebration } from './PlayingCard';
import { gameWallet, useGameWallet } from './game-wallet';
import type { GameSound } from './game-audio';
type TienRound={state:ReturnType<typeof createTien>;rewardPaid:boolean};
export function TienLen({playSound,motion}:{playSound:(k:GameSound)=>void;motion:boolean}){
 const funds=useGameWallet(),coins=funds.balance;
 const [state,setState]=useState<ReturnType<typeof createTien>|null>(()=>gameWallet.readRound<TienRound>('tien')?.state??null),[selected,setSelected]=useState<number[]>([]),[sorted,setSorted]=useState(true);
 const save=(next:ReturnType<typeof createTien>,newRound=false)=>{
   const paid=newRound?false:gameWallet.readRound<TienRound>('tien')?.rewardPaid??false;
   const award=next.winner===0&&!paid;
   if(gameWallet.writeRound('tien',{state:next,rewardPaid:paid||award},award?150:0))setState(next);
 };
 useEffect(()=>{if(!state)save(createTien(),true);},[]);
 useEffect(()=>{if(!state||state.winner!==null||state.player===0)return;const timer=setTimeout(()=>{const option=tienOptions(state)[0];save(tienMove(state,option?option.map(c=>c.id):null));playSound(option?'stone':'chip');},motion?900:250);return()=>clearTimeout(timer);},[state,motion,playSound]);
 useEffect(()=>{if(state?.winner===0)playSound('win');},[state?.winner,playSound]);
 const hand=useMemo(()=>state?(sorted?sortCards(state.hands[0]??[]):[...(state.hands[0]??[])].sort((a,b)=>a.suit-b.suit||a.rank-b.rank)):[],[state,sorted]);
 if(!state)return <div className="card-loading">Đang chia lộc xuân…</div>;
 const myTurn=state.player===0&&state.winner===null,chosen=hand.filter(c=>selected.includes(c.id));
 const legal=myTurn&&beats(chosen,state.pile)&&(!state.first||chosen.some(c=>c.rank===3&&c.suit===0));
 const play=()=>{if(!legal)return;save(tienMove(state,selected));setSelected([]);playSound('stone');};
 return <div className="premium-card-game tien-game"><header className="card-game-header"><div><span className="game-kicker">ĐINH MÙI 2027 · BÀI NAM</span><h2>Tiến Lên Miền Nam</h2></div><span>13 lá · 3 đối thủ AI</span><Button size="icon" variant="ghost" aria-label="Ván Tiến Lên mới" title="Ván mới" onClick={()=>{save(createTien(),true);setSelected([]);playSound('shake');}}><RotateCcw/></Button></header>
 <CardTable><Seat name="Lộc" position="top" count={state.hands[2]?.length} active={state.player===2}/><Seat name="Mai" position="left" count={state.hands[1]?.length} active={state.player===1}/><Seat name="An" position="right" count={state.hands[3]?.length} active={state.player===3}/>
 <div className="center-pile" key={`${state.leader}-${state.pile.map(c=>c.id).join('-')}`}><span className="table-inscription">❀ LỘC XUÂN ĐINH MÙI ❀</span><div className="pile-cards">{state.pile.map(c=><PlayingCard key={c.id} card={c} small/>)}</div><span role="status">{state.winner!==null?`${state.winner===0?'Bạn':['','Mai','Lộc','An'][state.winner]} ${state.white?'TỚI TRẮNG · '+state.white:'về nhất!'}`:state.log}</span></div>
 <div className="opponent-backs top-backs"><PlayingCard small/><PlayingCard small/><PlayingCard small/></div><Seat name="Bạn" position="bottom" coins={coins} active={myTurn}/></CardTable>
 <div className="tien-hand" aria-label="Bài của bạn">{hand.map(c=><PlayingCard key={c.id} card={c} selected={selected.includes(c.id)} disabled={!myTurn} onClick={()=>{setSelected(a=>a.includes(c.id)?a.filter(id=>id!==c.id):[...a,c.id]);playSound('chip');}}/>)}</div>
 <footer className="card-actions"><span>{state.winner!==null?'Mừng xuân · ván mới?':myTurn?'Lượt của bạn':`Đang chờ ${['','Mai','Lộc','An'][state.player]}…`}</span><Button variant="ghost" size="icon" aria-label="Gợi ý bài" title="Gợi ý bài" disabled={!myTurn} onClick={()=>setSelected((tienOptions(state)[0]??[]).map(c=>c.id))}><Lightbulb/></Button><Button variant="outline" onClick={()=>{setSorted(s=>!s);playSound('chip');}}><ArrowDownUp/>Xếp bài</Button><Button variant="outline" disabled={!myTurn||!state.pile.length} onClick={()=>{save(tienMove(state,null));setSelected([]);playSound('chip');}}><SkipForward/>Bỏ lượt</Button><Button className="gold-action" disabled={!legal} onClick={play}><Play/>Đánh bài</Button></footer><CardCelebration show={state.winner===0} motion={motion}/></div>;
}
