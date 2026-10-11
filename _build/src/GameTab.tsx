import './games.css';
import { FolkGames } from './components/games/FolkGames';

/** Drop-in Tet 2027 folk-games tab: Bầu Cua, Tài Xỉu, Tiến Lên, Xì Dách and Poker.
 *  All styling lives in games.css under .tet-games-theme, so nothing leaks into the host app. */
export function GameTab({ sound = true, motion = true, petals = true }: { sound?: boolean; motion?: boolean; petals?: boolean }) {
  return (
    <div className="tet-games-theme tet-games-tab">
      <FolkGames sound={sound} motion={motion} petals={petals} />
    </div>
  );
}
