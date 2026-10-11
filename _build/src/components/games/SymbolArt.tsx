import artwork from '../../assets/baucua-symbols.jpg';
import { SYMBOLS } from '../../lib/folk-games';
export function SymbolArt({ symbol }: { symbol: number }) {
  return <span className={`symbol-art symbol-${symbol}`}><img src={artwork} alt={SYMBOLS[symbol]} loading="lazy" width={1536} height={1024}/></span>;
}