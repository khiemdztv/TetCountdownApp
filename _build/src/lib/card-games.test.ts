import { describe,it,expect } from 'vitest';
import { type Card, deck } from './cards';
import { combination,beats,whiteWin,tienMove,type TienState } from './tienlen';
import { xiScore,xiKind,xiCompare,xiCanStand } from './xidach';
import { sidePots,pokerAwards,createPoker,pokerAction,type PokerSeat } from './poker';
const c=(rank:number,suit=0):Card=>({id:rank*4+suit,rank,suit});
describe('Tiến Lên Miền Nam',()=>{
 it('deals a unique deck of 52 for four hands of 13',()=>{const d=deck();expect(d).toHaveLength(52);expect(new Set(d.map(x=>x.id)).size).toBe(52);expect(d.slice(0,13)).toHaveLength(13);});
 it('ranks 2 above A and hearts above diamonds',()=>{expect(beats([c(2)],[c(14,3)])).toBe(true);expect(beats([c(8,3)],[c(8,2)])).toBe(true);});
 it('requires equal-length straights and excludes 2',()=>{expect(combination([c(13),c(14),c(2)])).toBeNull();expect(beats([c(4),c(5),c(6),c(7)],[c(3),c(4),c(5)])).toBe(false);});
 it('three consecutive pairs chop a single 2, not a pair',()=>{const pairs=[c(3),c(3,1),c(4),c(4,1),c(5),c(5,1)];expect(beats(pairs,[c(2)])).toBe(true);expect(beats(pairs,[c(2),c(2,1)])).toBe(false);});
 it('four of a kind chops two twos',()=>{expect(beats([0,1,2,3].map(s=>c(7,s)),[c(2),c(2,1)])).toBe(true);});
 it('recognizes 13-card four twos instant win',()=>{expect(whiteWin([...Array.from({length:4},(_,i)=>c(2,i)),...Array.from({length:9},(_,i)=>c(i+3))])).toBe('Tứ quý 2');});
 it('requires 3 spades on first move and rejects duplicate cards',()=>{const s:TienState={hands:[[c(3),c(4)],[c(5)],[c(6)],[c(7)]],player:0,pile:[],leader:0,passed:[],first:true,winner:null,white:null,log:''};expect(tienMove(s,[c(4).id])).toBe(s);expect(tienMove(s,[c(3).id,c(3).id])).toBe(s);expect(tienMove(s,[c(3).id]).player).toBe(1);});
 it('three passes reopen a clean trick to the leader',()=>{let s:TienState={hands:[[c(3)],[c(4)],[c(5)],[c(6)]],player:1,pile:[c(8)],leader:0,passed:[],first:false,winner:null,white:null,log:''};for(let i=0;i<3;i++)s=tienMove(s,null);expect(s.player).toBe(0);expect(s.pile).toEqual([]);});
});
describe('Xì Dách',()=>{
 it('ace switches between 11 and 1',()=>{expect(xiScore([c(14),c(8)])).toBe(19);expect(xiScore([c(14),c(8),c(7)])).toBe(16);});
 it('Xì Bàn beats Xì Dách',()=>{expect(xiKind([c(14),c(14,1)]).label).toBe('XÌ BÀN');expect(xiCompare([c(14),c(14,1)],[c(14),c(13)])).toBe(1);});
 it('five cards under 21 beat normal 21',()=>{expect(xiCompare([c(2),c(3),c(4),c(5),c(6)],[c(7),c(7,1),c(7,2)])).toBe(1);});
 it('stand minimum is 16',()=>{expect(xiCanStand([c(10),c(5)])).toBe(false);expect(xiCanStand([c(10),c(6)])).toBe(true);});
 it('both bust favors dealer; equal normal points tie',()=>{expect(xiCompare([c(10),c(10,1),c(5)],[c(13),c(12),c(6)])).toBe(-1);expect(xiCompare([c(10),c(9)],[c(11),c(9)])).toBe(0);});
});
describe('Texas Hold’em',()=>{
 it('starts 5 seats, 2 hole cards and blinds 10/20',()=>{const s=createPoker();expect(s.seats).toHaveLength(5);expect(s.seats.every(p=>p.cards.length===2)).toBe(true);expect(s.seats.map(p=>p.paid)).toEqual([0,10,20,0,0]);});
 it('side pots include folded contributions but not eligibility',()=>{expect(sidePots([100,200,300,200],[false,false,false,true])).toEqual([{amount:400,eligible:[0,1,2]},{amount:300,eligible:[1,2]},{amount:100,eligible:[2]}]);});
 it('uses best five of seven and conserves all side-pot chips',()=>{const board=[c(2),c(5,1),c(8,2),c(11,3),c(13)];const seat=(cards:Card[],paid:number):PokerSeat=>({cards,paid,stack:0,street:paid,folded:false,acted:true,status:''});const r=pokerAwards([seat([c(14),c(14,1)],100),seat([c(12),c(12,1)],200),seat([c(10),c(10,1)],300)],board);expect(r.awards).toEqual([300,200,100]);expect(r.awards.reduce((a,b)=>a+b,0)).toBe(600);});
 it('rejects raises below minimum',()=>{const s=createPoker();expect(pokerAction(s,'raise',30)).toBe(s);});
  it('short all-in does not reopen raising but permits an all-in call',()=>{const base=createPoker();const seats=base.seats.map((p,i)=>({...p,stack:i===0?5:100,paid:20,street:20,acted:true,folded:false}));const s={...base,seats,player:0,bet:30,minRaise:20};expect(pokerAction(s,'raise',50)).toBe(s);expect(pokerAction(s,'allin').seats[0]?.stack).toBe(0);});
 it('advances to flop after everyone calls and checks',()=>{let s=createPoker();for(let i=0;i<5;i++)s=pokerAction(s,'call');expect(s.stage).toBe(1);expect(s.board).toHaveLength(3);});
 it('runs out community cards automatically for all-in showdown',()=>{let s=createPoker([40,40,40,40,40]);for(let i=0;i<10&&!s.done;i++)s=pokerAction(s,'allin');expect(s.done).toBe(true);expect(s.board).toHaveLength(5);expect(s.seats.reduce((n,p)=>n+p.stack,0)).toBe(200);});
});
