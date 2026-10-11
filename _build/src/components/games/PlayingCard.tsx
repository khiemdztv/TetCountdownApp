import type { CSSProperties } from 'react';
import { Button } from '../ui/button';
import { type Card, cardLabel, rankLabel, SUITS } from '../../lib/cards';
import back from '../../assets/tet-card-back.jpg';
import table from '../../assets/tet-card-table.jpg';
export function PlayingCard({card,selected,onClick,small=false,disabled=false}:{card?:Card|undefined;selected?:boolean;onClick?:()=>void;small?:boolean;disabled?:boolean}) {
 const content=card?<><span className="card-corner">{rankLabel(card.rank)}<small>{SUITS[card.suit]}</small></span><span className="card-pip">{SUITS[card.suit]}</span><span className="card-corner card-corner-bottom">{rankLabel(card.rank)}<small>{SUITS[card.suit]}</small></span></>:<img src={back} width={768} height={1024} alt="Mặt bài dê vàng Đinh Mùi"/>;
 const cls=`playing-card ${card?(card.suit>=2?'card-red':'card-black'):'card-back'} ${selected?'card-selected':''} ${small?'card-small':''}`;
 return onClick?<Button variant="ghost" disabled={disabled} className={cls} aria-label={card?`Chọn ${cardLabel(card)}`:'Bài úp'} aria-pressed={selected} onClick={onClick}>{content}</Button>:<span className={cls} aria-label={card?cardLabel(card):'Bài úp'}>{content}</span>;
}
export function CardTable({children,className=''}:{children:React.ReactNode;className?:string}){return <div className={`card-table ${className}`}><img className="card-table-art" src={table} alt="" width={1536} height={1024}/>{children}</div>;}
export function Seat({name,coins=1000,count,active=false,position,status}:{name:string;coins?:number;count?:number|undefined;active?:boolean;position:string;status?:string}){return <div className={`card-seat seat-${position} ${active?'seat-active':''}`}><div className="seat-avatar"><img src={back} width={768} height={1024} alt="Dê vàng"/></div><div><strong>{name}</strong><small>{coins.toLocaleString('vi-VN')} Xu</small>{status&&<em>{status}</em>}</div>{count!==undefined&&<span className="seat-count">{count} lá</span>}</div>;}
export function CardCelebration({show,motion}:{show:boolean;motion:boolean}){return show&&motion?<><div className="card-firecrackers" aria-hidden="true"><span className="firecracker-string"/>✦<span className="firecracker-string"/></div><div className="coin-rain" aria-hidden="true">{Array.from({length:22},(_,i)=><i key={i} style={{'--left':`${i*4.7}%`,'--delay':`${i*.06}s`} as CSSProperties}>✦</i>)}</div></>:null;}
