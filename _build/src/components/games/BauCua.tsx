import { gameWallet, useGameWallet } from './game-wallet';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Coins, Dice3, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '../ui/button';
import { CHIPS, SYMBOLS, payout, placeChip, rollDice } from '../../lib/folk-games';
import bowlLid from '../../assets/baucua-lid.png';
import bowlPlate from '../../assets/baucua-plate.png';
import { SymbolArt } from './SymbolArt';
type Round = { dice: number[]; net: number };
export function BauCua({ playSound, motion }: { playSound: (kind: 'chip'|'shake'|'win'|'stone') => void; motion: boolean }) {
  const funds=useGameWallet();
  const [bets,setBets]=useState(Array<number>(6).fill(0));
  const wallet={balance:funds.balance,bets};
  const round=useRef('bau-'+crypto.randomUUID());
  const lock=useRef(false);
  const [chip,setChip]=useState<number|'All-in'>(50);
  const [phase,setPhase]=useState<'ready'|'shaking'|'open'>('ready');
  const [dice,setDice]=useState<number[]>([0,1,2]);
  const [history,setHistory]=useState<Round[]>([]);
  const [message,setMessage]=useState('Chọn xu may mắn · đặt vào linh vật');
  const [won,setWon]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const undo=useRef<typeof wallet[]>([]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);gameWallet.release(round.current);},[]);
  const total=wallet.bets.reduce((a,b)=>a+b,0);
  const bet=(i:number)=>{
    if(lock.current)return;
    const next=placeChip(gameWallet.getSnapshot().balance,wallet.bets,i,chip);
    if(next.bets===wallet.bets || !gameWallet.reserve(round.current,next.bets.reduce((a,b)=>a+b,0)-total)){setMessage('Không đủ Xu cho mệnh giá này');return;}
    undo.current.push(wallet);setBets(next.bets);setPhase('ready');setWon(false);playSound('chip');setMessage(`Đã đặt ${next.bets[i]} Xu vào ${SYMBOLS[i]}`);
  };
  const shake=()=>{
    if(!total||lock.current)return;
    lock.current=true;
    setPhase('shaking');setWon(false);setMessage('Lộc xuân đang đến…');playSound('shake');
    const result=rollDice(), returned=payout(wallet.bets,result), net=returned-total;
    gameWallet.commit(round.current,returned);
    timer.current=setTimeout(()=>{
      setDice(result);gameWallet.release(round.current);lock.current=false;setBets(Array<number>(6).fill(0));undo.current=[];
      setHistory(h=>[{dice:result,net},...h].slice(0,4));setPhase('open');setWon(net>0);
      setMessage(net>0?`Lộc đến! +${net.toLocaleString('vi-VN')} Xu`:net===0?'Hòa xu · Thử vận may lần nữa!':`Chưa gặp lộc · ${net} Xu`);
      if(net>0)playSound('win');
    },motion?1300:150);
  };
  const reset=()=>{if(lock.current)return;gameWallet.release(round.current);setBets(Array<number>(6).fill(0));setHistory([]);setPhase('ready');setWon(false);undo.current=[];setMessage('Đã xóa bàn · Xu giữ trong ví chung');};
  return <div className={`bau-cua ${motion?'':'no-game-motion'}`}>
    <header className="game-heading"><div><span className="game-kicker">VUI XUÂN · ĐINH MÙI</span><h2>Bầu Cua Tôm Cá</h2></div><div className="wallet"><span>🧧 Lì xì của bạn</span><strong aria-label="Số dư">{wallet.balance.toLocaleString('vi-VN')} <small>Xu</small></strong></div></header>
    <div className="bau-main"><div className="bet-grid">{SYMBOLS.map((name,i)=><Button key={name} variant="ghost" className={`bet-tile ${wallet.bets[i]?'has-bet':''} ${phase==='open'&&dice.includes(i)?'lucky-tile':''}`} disabled={phase==='shaking'} aria-label={`Đặt xu ${name}`} onClick={()=>bet(i)}><SymbolArt symbol={i}/><span className="tile-caption">{name}<span className="tile-bet"><Coins size={9}/>{wallet.bets[i]||'+'}</span></span></Button>)}</div>
    <div className="shake-area"><div className={`bowl-stage ${phase==='shaking'?'shaking':''} ${phase==='open'?'opened':''}`}>
      <div className="bowl-rig">
        <img src={bowlPlate} className="bowl-plate" alt="Đĩa sơn mài rồng phượng" width={1005} height={657} draggable={false}/>
        {phase==='open'&&<div className="dice-row">{dice.map((d,i)=><div className="game-die" key={i}><SymbolArt symbol={d}/></div>)}</div>}
        <img src={bowlLid} className="lacquer-bowl" alt="Nắp bát sơn mài rồng phượng" width={786} height={766} draggable={false}/>
      </div>
      <span className="bowl-spark one">✦</span><span className="bowl-spark two">✧</span>
    </div><Button className="shake-button" onClick={shake} disabled={!total||phase==='shaking'}><Dice3/>{phase==='shaking'?'ĐANG LẮC…':'LẮC BẦU CUA'}</Button><p className={`roll-message ${won?'text-primary':''}`} role="status">{message}</p></div></div>
    <div className="bau-bottom"><div className="roll-history"><span className="game-kicker">LỘC VỪA QUA</span><div>{history.length?history.map((r,i)=><span key={i} className="history-roll" title={r.dice.map(d=>SYMBOLS[d]).join(' · ')}>{r.dice.map((d,j)=><SymbolArt key={j} symbol={d}/>)}<small className={r.net>0?'text-primary':'text-muted-foreground'}>{r.net>0?'+':''}{r.net}</small></span>):<span className="text-muted-foreground">Chưa có lượt lắc</span>}</div></div><div className="chip-tray"><span className="game-kicker">CHỌN XU <span>Đã đặt: {total} Xu</span></span><div>{CHIPS.map(c=><Button key={c} variant="ghost" className={`game-chip ${chip===c?'selected':''}`} aria-pressed={chip===c} onClick={()=>setChip(c)} disabled={phase==='shaking'}>{c}</Button>)}<Button variant="ghost" size="icon" title="Hoàn tác đặt xu" aria-label="Hoàn tác đặt xu" disabled={!total||phase==='shaking'} onClick={()=>{const previous=undo.current.pop();if(previous){gameWallet.refund(round.current,total-previous.bets.reduce((a,b)=>a+b,0));setBets(previous.bets);}}}><Undo2/></Button><Button variant="ghost" size="icon" title="Xóa bàn Bầu Cua" aria-label="Xóa bàn Bầu Cua" disabled={phase==='shaking'} onClick={reset}><RotateCcw/></Button></div></div></div>
    {won&&motion&&<div className="coin-rain" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--left':`${i*5.7}%`,'--delay':`${i*.07}s`} as CSSProperties}>✦</i>)}</div>}
  </div>;
}