import { gameWallet, useGameWallet } from './game-wallet';
import { useEffect, useRef, useState } from 'react';
import { Coins, Dice3, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '../ui/button';
import { placeTaiXiu, rollTaiXiu, taiXiuReturn, TAI_XIU_CHIPS, type TaiXiuResult, type TaiXiuSide } from '../../lib/taixiu';
import bowlLid from '../../assets/baucua-lid.png';
import bowlPlate from '../../assets/baucua-plate.png';
import { CardCelebration } from './PlayingCard';
import type { GameSound } from './game-audio';
const pips: Record<number, number[]> = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function Dice({value}: {value:number}) {
  return <span className={`sic-die ${value===1||value===4?'sic-red':''}`} aria-label={`Xúc xắc ${value} điểm`}>{Array.from({length:9},(_,i)=><i key={i} className={pips[value]?.includes(i)?'pip':''}/>)}</span>;
}
export function TaiXiu({playSound,motion}: {playSound:(k:GameSound)=>void;motion:boolean}) {
  const funds=useGameWallet();
  const [bets,setBets]=useState({xiu:0,tai:0});
  const wallet={balance:funds.balance,bets};
  const round=useRef('sic-'+crypto.randomUUID());
  const [chip,setChip]=useState<number|'MAX'>(50);
  const [phase,setPhase]=useState<'ready'|'shaking'|'open'>('ready');
  const [dice,setDice]=useState([1,3,5]);
  const [result,setResult]=useState<TaiXiuResult|null>(null);
  const [history,setHistory]=useState<TaiXiuResult[]>([]);
  const [message,setMessage]=useState('Lộc xuân chờ mở');
  const [won,setWon]=useState(false);
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
  const lock=useRef(false);
  const undo=useRef<typeof wallet[]>([]);
  useEffect(()=>()=>{timers.current.forEach(clearTimeout);gameWallet.release(round.current);},[]);
  const total=wallet.bets.xiu+wallet.bets.tai;
  const bet=(side:TaiXiuSide)=>{
    if(lock.current)return;
    const next=placeTaiXiu(gameWallet.getSnapshot().balance,wallet.bets,side,chip);
    if(next.bets===wallet.bets || !gameWallet.reserve(round.current,next.bets.tai+next.bets.xiu-total)){setMessage('Không đủ Xu cho mệnh giá này');return;}
    undo.current.push(wallet);setBets(next.bets);setPhase('ready');setResult(null);setWon(false);playSound('chip');setMessage(`Đã đặt ${next.bets[side]} Xu · ${side==='tai'?'Tài':'Xỉu'}`);
  };
  const shake=()=>{
    if(!total||lock.current)return;
    lock.current=true;setPhase('shaking');setWon(false);setResult(null);setMessage('Đang xóc lộc xuân…');playSound('shake');
    const next=rollTaiXiu(),returned=taiXiuReturn(wallet.bets,next),net=returned-total;
    gameWallet.commit(round.current,returned);
    if(motion)for(let i=1;i<13;i++)timers.current.push(setTimeout(()=>{setDice(rollTaiXiu().dice);if(i%3===0)playSound('stone');},i*100));
    timers.current.push(setTimeout(()=>{
      setDice(next.dice);setResult(next);setPhase('open');gameWallet.release(round.current);setBets({tai:0,xiu:0});undo.current=[];lock.current=false;
      setHistory(h=>[...h,next].slice(-12));setWon(net>0);
      setMessage(net>0?`Lì xì về! +${net.toLocaleString('vi-VN')} Xu`:net===0?'Hòa Xu · Lộc còn phía trước':`Chưa gặp lộc · ${net} Xu`);playSound(net>0?'win':'reveal');
    },motion?1500:150));
  };
  const reset=()=>{if(lock.current)return;gameWallet.release(round.current);setBets({tai:0,xiu:0});setHistory([]);setResult(null);setPhase('ready');setWon(false);undo.current=[];setMessage('Đã xóa bàn · Xu giữ trong ví chung');playSound('chip');};
  return <div className={`taixiu-game ${phase==='shaking'?'sic-shaking':''} ${phase==='open'?'sic-open':''}`}>
    <header className="sic-heading"><h2>TÀI XỈU <span>— TẾT 2027</span></h2><span className="sic-virtual">XU VUI XUÂN</span></header>
    <div className="sic-history" aria-label="Lịch sử Tài Xỉu"><span>LỘC VỪA QUA</span>{history.length?history.map((r,i)=><b className={`sic-history-${r.side}`} key={i} title={`${r.total} điểm · ${r.side==='triple'?'Bộ ba':r.side==='tai'?'Tài':'Xỉu'}`}>{r.side==='triple'?'B':r.side==='tai'?'T':'X'}</b>):<small>— — — — —</small>}</div>
    <div className="sic-arena">
      <div className="sic-shaker" aria-label="Bát sơn mài lắc ba xúc xắc"><img className="bowl-plate" src={bowlPlate} alt="Đĩa sơn mài rồng phượng" width={1005} height={657} draggable={false}/><div className="sic-dice">{dice.map((d,i)=><Dice key={i} value={d}/>)}</div><img className="lacquer-bowl" src={bowlLid} alt="Nắp bát sơn mài rồng phượng" width={786} height={766} draggable={false}/></div>
      <div className="sic-zones">{(['xiu','tai'] as const).map(side=><Button variant="ghost" key={side} onClick={()=>bet(side)} disabled={phase==='shaking'} aria-label={`Đặt xu ${side==='xiu'?'Xỉu':'Tài'}`} aria-pressed={wallet.bets[side]>0} className={`sic-zone sic-${side} ${wallet.bets[side]?'sic-bet':''} ${result?.side===side?'sic-winner':''}`}><span className="sic-zone-label">{side==='xiu'?'XỈU':'TÀI'}</span><small>{side==='xiu'?'Từ 4 đến 10 điểm':'Từ 11 đến 17 điểm'}</small><span className="sic-zone-bet"><Coins/>{wallet.bets[side].toLocaleString('vi-VN')} Xu</span></Button>)}</div>
      <div className={`sic-result ${result?'sic-revealed':''}`} role="status">{result?<><strong>{result.total} Điểm <span>· {result.side==='triple'?'BỘ BA':result.side==='tai'?'TÀI':'XỈU'}</span></strong><small>{message}</small></>:<small>{message}</small>}</div>
    </div>
    <footer className="sic-dashboard"><div className="sic-wallet"><Coins/><span>Lì xì<strong aria-label="Số dư Tài Xỉu">{wallet.balance.toLocaleString('vi-VN')} <small>Xu</small></strong></span></div><div className="sic-chip-group"><span>Đã đặt <b>{total.toLocaleString('vi-VN')} Xu</b></span><div className="chip-tray"><div>{TAI_XIU_CHIPS.map(c=><Button key={c} variant="ghost" className={`game-chip ${chip===c?'selected':''}`} aria-pressed={chip===c} disabled={phase==='shaking'} onClick={()=>{setChip(c);playSound('chip');}}>{c}</Button>)}<Button variant="ghost" size="icon" aria-label="Hoàn tác Tài Xỉu" title="Hoàn tác đặt xu" disabled={!total||phase==='shaking'} onClick={()=>{const previous=undo.current.pop();if(previous){gameWallet.refund(round.current,total-previous.bets.tai-previous.bets.xiu);setBets(previous.bets);}playSound('chip');}}><Undo2/></Button><Button variant="ghost" size="icon" aria-label="Xóa bàn Tài Xỉu" title="Xóa bàn Tài Xỉu" disabled={phase==='shaking'} onClick={reset}><RotateCcw/></Button></div></div></div><Button className="sic-shake-button" onClick={shake} disabled={!total||phase==='shaking'}><Dice3/>{phase==='shaking'?'ĐANG XÓC…':'LẮC / XÓC'}</Button></footer>
    <CardCelebration show={won} motion={motion}/>
  </div>;
}