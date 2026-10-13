import { useEffect, useState, type CSSProperties } from 'react';
import { gameWallet, useGameWallet } from './game-wallet';
import { CircleHelp, Dice3, Music2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { BauCua } from './BauCua';
import { TaiXiu } from './TaiXiu';
import { SymbolArt } from './SymbolArt';
import { useGameAudio } from './game-audio';
import { TienLen } from './TienLen';
import { XiDach } from './XiDach';
import { Poker } from './Poker';
type GameId = 'bau'|'sic'|'tien'|'xi'|'poker';
const cardRules = {
 tien: ['Mỗi người 13 lá; ván mới người có 3 bích đi trước và phải đánh 3 bích. Thứ tự: 3 đến A rồi 2; bích < tép < rô < cơ.', 'Đánh rác, đôi, bộ ba, tứ quý, sảnh từ 3 lá hoặc đôi thông. Không dùng 2 trong sảnh hay đôi thông. Bài cùng loại và cùng độ dài phải lớn hơn.', 'Ba đôi thông chặt một 2; tứ quý hoặc bốn đôi thông chặt một/đôi 2. Tứ quý chặt ba đôi thông; bốn đôi thông chặt tứ quý. Chỉ chặt trong lượt, không phạt thối.', 'Bỏ lượt thì nghỉ đến hết vòng. Cả ba người bỏ: người đánh cuối mở vòng mới. Hết bài trước thắng, nhận thưởng 150 Xu ảo.', 'Tới Trắng: tứ quý 2, sảnh rồng 3–A, sáu đôi hoặc năm đôi thông. Nếu nhiều người cùng có, ưu tiên ghế Bạn rồi Mai, Lộc, An.'],
 xi: ['Chọn 10 / 50 / 100 / 500 Xu ảo rồi chia bài. Bạn và Nhà Cái có hai lá, một lá Nhà Cái úp.', 'A tính 1 hoặc 11 để có điểm tốt nhất không quá 21. J, Q, K tính 10. Rút tối đa 5 lá; được dằn từ 16 điểm.', 'Xì Bàn (hai A) > Xì Dách (A và 10/J/Q/K) > Ngũ Linh (5 lá không quá 21) > điểm thường. Ngũ Linh ít điểm hơn thắng.', 'Nhà Cái rút đến ít nhất 17 điểm rồi dằn. Quá 21 là quắc; cả hai quắc thì Nhà Cái thắng. Bài đặc biệt so ngay sau chia.', 'Thắng trả lại cược và thêm một lần cược; hòa hoàn cược. Xu chỉ dùng vui chơi, không đổi thành tiền.'],
 poker: ['Texas Hold’em: 5 ghế, mỗi người hai lá riêng; 5 lá chung qua Flop, Turn và River. Ghép bộ 5 lá tốt nhất từ 7 lá.', 'Cược nhỏ 10, cược lớn 20 Xu. Lần lượt Bỏ bài, Check/Theo, Tố hoặc Tất tay. Tố tối thiểu bằng lần tố đủ trước đó; tối thiểu 20 Xu.', 'Hết một vòng khi tất cả người còn tiền đã theo đủ hoặc bỏ. Tất tay ít hơn mức tố tối thiểu không mở lại quyền tố cho người đã hành động.', 'Tất tay được chia pot phụ theo mức góp; người bỏ bài không được nhận pot. Đồng hạng chia đều, Xu lẻ theo thứ tự ghế.', 'Ván kết thúc khi còn một người hoặc so bài sau River. Bấm mũi tên chơi ván mới; đối thủ hết xu sẽ được bổ sung cho bàn mới. Xu của bạn luôn lấy từ ví chung.']
};
export function FolkGames({ sound, motion, petals }: {sound:boolean;motion:boolean;petals:boolean}) {
  const wallet = useGameWallet();
  const [now,setNow] = useState(Date.now());
  useEffect(() => { const timer=setInterval(()=>{gameWallet.refresh();setNow(Date.now());},30000);return()=>clearInterval(timer); },[]);
  const remaining=Math.max(1,Math.ceil((wallet.nextRewardAt-now)/60000));
  const [game,setGame]=useState<GameId>('sic');
  const [muted,setMuted]=useState(false);
  const [rules,setRules]=useState(false);
  const [music,setMusic]=useState(false);
  const [volume,setVolume]=useState(.5);
  const playSound=useGameAudio(sound&&!muted,music,volume);
  return <section className={`folk-games ${motion?'':'no-game-motion'}`}>
    <div className="game-toolbar"><div role="tablist" aria-label="Trò chơi dân gian">{([{id:'bau',label:'Bầu Cua'},{id:'sic',label:'Tài Xỉu'},{id:'tien',label:'Tiến Lên'},{id:'xi',label:'Xì Dách'},{id:'poker',label:'Poker'}] as const).map(item=><Button key={item.id} role="tab" aria-selected={game===item.id} variant="ghost" className={game===item.id?'selected':''} onClick={()=>{setGame(item.id);playSound('chip');}}>{item.id==='bau'||item.id==='sic'?<Dice3/>:<span aria-hidden="true">{item.id==='tien'?'♠':item.id==='xi'?'♥':'♦'}</span>}{item.label}</Button>)}</div><div className="game-audio-controls"><Button variant="ghost" size="icon" onClick={()=>{setMusic(!music);playSound('chip');}} aria-pressed={music} className={music?'selected':''} title={music?'Tắt nhạc nền':'Bật nhạc nền'} aria-label={music?'Tắt nhạc nền':'Bật nhạc nền'}><Music2/></Button><input className="game-volume" aria-label="Âm lượng trò chơi" type="range" min="0" max="100" value={volume*100} onChange={e=>setVolume(Number(e.target.value)/100)}/><Button variant="ghost" size="icon" onClick={()=>setRules(true)} title="Hướng dẫn chơi" aria-label="Hướng dẫn chơi"><CircleHelp/></Button><Button variant="ghost" size="icon" onClick={()=>{setMuted(!muted);if(muted)playSound('chip');}} title={muted?'Bật âm thanh trò chơi':'Tắt âm thanh trò chơi'} aria-label={muted?'Bật âm thanh trò chơi':'Tắt âm thanh trò chơi'}>{muted||!sound?<VolumeX/>:<Volume2/>}</Button></div></div>
    <div className="shared-wallet" aria-label="Ví Xu chung"><strong>🧧 <span data-wallet-balance>{wallet.balance.toLocaleString('vi-VN')}</span> Xu</strong><span>{wallet.error || `+1.000 Xu sau ${Math.floor(remaining/60)} giờ ${remaining%60} phút`}</span></div>
    <div className="game-surface">{game==='bau'?<BauCua playSound={playSound} motion={motion}/>:game==='sic'?<TaiXiu playSound={playSound} motion={motion}/>:game==='tien'?<TienLen playSound={playSound} motion={motion}/>:game==='xi'?<XiDach playSound={playSound} motion={motion}/>:<Poker playSound={playSound} motion={motion}/>}</div>
    {motion&&petals&&<div className="game-petals" aria-hidden="true">{Array.from({length:6},(_,i)=><span style={{'--left':`${4+i*18}%`,'--delay':`${-i*2}s`} as CSSProperties} key={i}>❀</span>)}</div>}
    <Dialog open={rules} onOpenChange={setRules}><DialogContent className="tet-games-theme game-dialog"><DialogTitle className="font-display text-primary">Hướng dẫn · {{bau:'Bầu Cua Tôm Cá',sic:'Tài Xỉu',tien:'Tiến Lên Miền Nam',xi:'Xì Dách',poker:'Poker'}[game]}</DialogTitle><DialogDescription>Vui xuân bằng Xu ảo · không quy đổi thành tiền.</DialogDescription>
    {(game==='tien'||game==='xi'||game==='poker')&&<ol className="rules-list">{cardRules[game].map(rule=><li key={rule}>{rule}</li>)}</ol>}
    {game==='sic'&&<ol className="rules-list"><li>Chọn xu 10, 50, 100, 500 hoặc MAX, rồi đặt vào Tài hoặc Xỉu. MAX đặt toàn bộ số dư còn lại; có thể hoàn tác trước khi xóc.</li><li>Xóc ba xúc xắc sáu mặt. Xỉu thắng từ 4–10 điểm; Tài thắng từ 11–17 điểm.</li><li>Nếu cả ba xúc xắc giống nhau (bộ ba), cả Tài và Xỉu đều thua, kể cả tổng nằm trong khoảng thắng.</li><li>Trúng: nhận lại xu đã đặt và thêm một lần cược (1:1). Không trúng: mất xu đã đặt.</li><li>Xu dùng chung cho mọi trò chơi, tự lưu khi đóng app. Mỗi 5 giờ được thêm 1.000 Xu, kể cả khi app đóng.</li></ol>}
    {game==='bau'&&<><div className="rules-symbols">{[0,1,2,3,4,5].map(i=><SymbolArt key={i} symbol={i}/>)}</div><ol className="rules-list"><li>Chọn 10, 50, 100, 500 Xu hoặc All-in, rồi bấm linh vật để đặt xu. Có thể đặt nhiều ô và hoàn tác.</li><li>Bấm LẮC BẦU CUA để mở 3 xúc xắc.</li><li>Trúng 1 / 2 / 3 mặt: nhận lại xu đã đặt và thêm 1 / 2 / 3 lần xu đặt. Không trúng: mất xu đặt.</li><li>Xu dùng chung cho mọi trò chơi và được lưu lại. Mỗi 5 giờ tự cộng 1.000 Xu. Xóa bàn chỉ hoàn xu chưa lắc.</li></ol></>}
    <Button onClick={()=>setRules(false)}>Vào chơi thôi!</Button></DialogContent></Dialog>
  </section>;
}
