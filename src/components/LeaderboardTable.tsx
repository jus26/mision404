import { RefreshCw, Trophy } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  isConnected: boolean;
  onRefresh: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LeaderboardTable({
  entries,
  isLoading,
  isConnected,
  onRefresh,
}: LeaderboardTableProps) {
  return (
    <section
      aria-label="Clasificación de mejores partidas"
      className="rounded-2xl border border-slate-800 bg-[#12192b] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Clasificación · Top 10
            </h2>
            <p className="text-xs text-slate-400">
              Ordenado por puntuación descendente, menor tiempo y fecha de finalización
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading || !isConnected}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {!isConnected ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-6 text-center text-sm text-rose-200">
          MongoDB desconectado. La clasificación solo muestra partidas reales almacenadas en Atlas.
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-400">
          {isLoading
            ? 'Cargando clasificación desde MongoDB Atlas...'
            : 'Todavía no hay partidas terminadas. Completa una misión para inaugurar el ranking.'}
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                <th className="py-2.5 pr-3">Pos.</th>
                <th className="py-2.5 px-3">Alias</th>
                <th className="py-2.5 px-3 text-right">Puntuación</th>
                <th className="py-2.5 px-3 text-right">Aciertos</th>
                <th className="py-2.5 px-3 text-right">Pistas</th>
                <th className="py-2.5 px-3 text-right">Tiempo</th>
                <th className="py-2.5 pl-3 text-right">Finalización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {entries.map((entry, idx) => (
                <tr
                  key={`${entry.player}-${entry.finishedAt}-${idx}`}
                  className="hover:bg-slate-900/60"
                >
                  <td className="py-3 pr-3 font-mono text-xs font-semibold text-slate-300 tabular-nums">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3 font-medium text-white">{entry.player}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-300 tabular-nums">
                    {entry.score} pts
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums">
                    {entry.correctAnswers}/5
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400 tabular-nums">
                    {entry.hintsUsed}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums">
                    {formatDuration(entry.durationSeconds)}
                  </td>
                  <td className="py-3 pl-3 text-right font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                    {formatDate(entry.finishedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
