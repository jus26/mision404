import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Database,
  HelpCircle,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import { ControlCenterPanel } from './components/ControlCenterPanel';
import { RecoveryScene } from './components/RecoveryScene';
import { LeaderboardTable } from './components/LeaderboardTable';
import {
  AnswerResponse,
  HealthResponse,
  LeaderboardEntry,
  ModuleId,
  PublicChallenge,
  RunFinishResponse,
} from './types';

type ScreenState = 'start' | 'playing' | 'finished';

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('start');
  const [activeNav, setActiveNav] = useState<'control' | 'ranking'>('control');

  // Health & DB state
  const [mongoConnected, setMongoConnected] = useState<boolean>(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);

  // Challenges & Leaderboard
  const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);

  // Player & Run state
  const [alias, setAlias] = useState<string>('');
  const [runId, setRunId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [restoredModules, setRestoredModules] = useState<ModuleId[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Active challenge feedback
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState<boolean>(false);
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [startingRun, setStartingRun] = useState<boolean>(false);
  const [finishingRun, setFinishingRun] = useState<boolean>(false);
  const [roundResult, setRoundResult] = useState<AnswerResponse | null>(null);
  const [finalSummary, setFinalSummary] = useState<RunFinishResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) {
        setLeaderboard([]);
        return;
      }
      const data = (await res.json()) as LeaderboardEntry[];
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const checkHealthAndLoad = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = (await res.json()) as HealthResponse;
      const connected = res.ok && data.mongodb === 'connected';
      setMongoConnected(connected);
      setHealthMessage(data.message || null);

      if (connected) {
        const [challengesRes] = await Promise.all([
          fetch('/api/challenges'),
          fetchLeaderboard(),
        ]);
        if (challengesRes.ok) {
          const list = (await challengesRes.json()) as PublicChallenge[];
          setChallenges(Array.isArray(list) ? list : []);
        }
      } else {
        setChallenges([]);
        setLeaderboard([]);
      }
    } catch {
      setMongoConnected(false);
      setHealthMessage('No se pudo contactar con el servidor.');
      setChallenges([]);
      setLeaderboard([]);
    } finally {
      setHealthLoading(false);
    }
  }, [fetchLeaderboard]);

  useEffect(() => {
    void checkHealthAndLoad();
  }, [checkHealthAndLoad]);

  // Live timer while playing
  useEffect(() => {
    if (screen !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen]);

  const currentChallenge = challenges[currentIndex] ?? null;

  async function handleStartGame(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmed = alias.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 20) {
      setFormError('El alias debe tener entre 2 y 20 caracteres.');
      return;
    }

    if (!mongoConnected) {
      setFormError('MongoDB desconectado. Configura MONGODB_URI en el servidor para jugar.');
      return;
    }

    setStartingRun(true);
    try {
      const res = await fetch('/api/runs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo iniciar la partida.');
      }

      if (challenges.length === 0) {
        const chRes = await fetch('/api/challenges');
        if (!chRes.ok) {
          throw new Error('No se pudieron cargar las misiones desde MongoDB.');
        }
        const list = (await chRes.json()) as PublicChallenge[];
        setChallenges(list);
      }

      setRunId(data.runId);
      setAlias(data.player);
      setCurrentIndex(0);
      setSelectedOption(null);
      setScore(0);
      setCorrectAnswers(0);
      setHintsUsed(0);
      setRestoredModules([]);
      setElapsedSeconds(0);
      setCurrentHint(null);
      setRoundResult(null);
      setFinalSummary(null);
      setActiveNav('control');
      setScreen('playing');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al iniciar la recuperación.');
    } finally {
      setStartingRun(false);
    }
  }

  async function handleRequestHint() {
    if (!runId || !currentChallenge || currentHint || hintLoading || roundResult) return;

    setHintLoading(true);
    setFormError(null);
    try {
      const res = await fetch('/api/runs/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          challengeId: currentChallenge._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo obtener la pista.');
      }

      setCurrentHint(data.hint);
      setHintsUsed(data.hintsUsed);
      setScore(data.score);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al pedir la pista.');
    } finally {
      setHintLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!runId || !currentChallenge || selectedOption === null || submittingAnswer || roundResult) {
      return;
    }

    setSubmittingAnswer(true);
    setFormError(null);
    try {
      const res = await fetch('/api/runs/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          challengeId: currentChallenge._id,
          selectedOption,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo comprobar la respuesta.');
      }

      const answerResult = data as AnswerResponse;
      setScore(answerResult.score);
      setCorrectAnswers(answerResult.correctAnswers);
      setHintsUsed(answerResult.hintsUsed);
      setRestoredModules(answerResult.restoredModules);
      setRoundResult(answerResult);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al enviar la respuesta.');
    } finally {
      setSubmittingAnswer(false);
    }
  }

  async function handleContinueAfterScene() {
    if (!runId) return;

    const isLast = currentIndex >= challenges.length - 1;
    if (!isLast) {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOption(null);
      setCurrentHint(null);
      setRoundResult(null);
      setFormError(null);
      return;
    }

    setFinishingRun(true);
    setFormError(null);
    try {
      const res = await fetch('/api/runs/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo finalizar la partida.');
      }

      const summary = data as RunFinishResponse;
      setFinalSummary(summary);
      setScore(summary.score);
      setCorrectAnswers(summary.correctAnswers);
      setHintsUsed(summary.hintsUsed);
      setRestoredModules(summary.restoredModules);
      setScreen('finished');
      void fetchLeaderboard();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el resultado final.');
    } finally {
      setFinishingRun(false);
    }
  }

  function handlePlayAgain() {
    setRunId(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setCorrectAnswers(0);
    setHintsUsed(0);
    setRestoredModules([]);
    setElapsedSeconds(0);
    setCurrentHint(null);
    setRoundResult(null);
    setFinalSummary(null);
    setFormError(null);
    setScreen('start');
    setActiveNav('control');
    void fetchLeaderboard();
  }

  return (
    <div className="min-h-screen bg-[#0b101b] text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="border-b border-slate-800/90 bg-[#0e1525]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => {
              setActiveNav('control');
              if (screen === 'finished') handlePlayAgain();
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Misión 404
          </button>

          <nav aria-label="Navegación principal" className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveNav('control')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'control'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Centro de control
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('ranking');
                if (mongoConnected) void fetchLeaderboard();
              }}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'ranking'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Clasificación
            </button>
          </nav>

          {/* Real live DB telemetry status indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void checkHealthAndLoad()}
              className={`inline-flex min-h-[36px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                healthLoading
                  ? 'border-slate-700 bg-slate-900 text-slate-300'
                  : mongoConnected
                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-950/50 text-rose-300'
              }`}
              title="Comprobar estado de conexión con MongoDB Atlas"
            >
              <Database className="h-3.5 w-3.5" />
              {healthLoading
                ? 'Comprobando MongoDB...'
                : mongoConnected
                  ? 'MongoDB conectado'
                  : 'MongoDB desconectado'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        {/* Alert when MongoDB is disconnected */}
        {!healthLoading && !mongoConnected && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 text-sm text-rose-100"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold text-white">MongoDB desconectado</p>
                <p className="mt-1 text-rose-200">
                  {healthMessage ||
                    'No hay conexión activa con MongoDB Atlas. Configura la variable privada MONGODB_URI en el entorno del servidor para cargar las misiones y guardar partidas reales.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'ranking' ? (
          <LeaderboardTable
            entries={leaderboard}
            isLoading={leaderboardLoading}
            isConnected={mongoConnected}
            onRefresh={() => void fetchLeaderboard()}
          />
        ) : (
          <>
            {/* Control Center always visible as the anchor of the experience */}
            <ControlCenterPanel
              restoredModules={restoredModules}
              activeModuleId={screen === 'playing' ? currentChallenge?.moduleId : null}
              statusMessage={
                screen === 'playing' && roundResult
                  ? roundResult.correct
                    ? `${roundResult.moduleName} recuperado. Pulsa continuar para seguir restaurando la academia.`
                    : `${roundResult.moduleName} continúa bloqueado. Revisa la explicación antes de avanzar.`
                  : screen === 'playing' && currentChallenge
                    ? `En curso: Misión ${currentIndex + 1} (${currentChallenge.moduleName}).`
                    : undefined
              }
            />

            {screen === 'start' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-2xl border border-slate-800 bg-[#12192b] p-6 sm:p-8 lg:col-span-5">
                  <p className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                    Operación de rescate
                  </p>
                  <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white text-balance">
                    Recupera el sistema de la academia
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    La Academia 404 ha quedado bloqueada: no es posible acceder, consultar
                    matrículas, revisar horarios, entrar al aula virtual ni verificar certificados.
                    Supera cinco misiones para encender cada servicio en el centro de control.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-[#0d1322] p-4 text-xs">
                    <div>
                      <p className="text-slate-400">Acierto por misión</p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-300 tabular-nums">
                        +100 puntos
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Uso de pista</p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-amber-300 tabular-nums">
                        -25 puntos (mín. 0)
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleStartGame} className="mt-6 space-y-4">
                    <div>
                      <label
                        htmlFor="player-alias"
                        className="block text-sm font-medium text-slate-200"
                      >
                        Tu alias (2 a 20 caracteres)
                      </label>
                      <input
                        id="player-alias"
                        type="text"
                        value={alias}
                        onChange={(e) => {
                          setAlias(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        maxLength={24}
                        placeholder="Ej. Ana"
                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-[#0b101b] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    {formError && (
                      <p role="alert" className="text-xs font-medium text-rose-300">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={startingRun || !mongoConnected}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                    >
                      {startingRun ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Iniciando partida...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Comenzar recuperación
                        </>
                      )}
                    </button>
                  </form>
                </section>

                <div className="lg:col-span-7">
                  <LeaderboardTable
                    entries={leaderboard}
                    isLoading={leaderboardLoading}
                    isConnected={mongoConnected}
                    onRefresh={() => void fetchLeaderboard()}
                  />
                </div>
              </div>
            )}

            {screen === 'playing' && currentChallenge && (
              <section
                aria-label="Desafío actual"
                className="rounded-2xl border border-slate-800 bg-[#12192b] p-6 sm:p-8"
              >
                {/* Live HUD */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
                    <span>
                      Operador: <strong className="text-white">{alias}</strong>
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="font-mono tabular-nums">
                      Misión {currentIndex + 1} de {challenges.length}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="font-mono tabular-nums">
                      Servicios recuperados: {restoredModules.length} de 5
                    </span>
                  </div>

                  <div className="flex items-center gap-5 font-mono text-sm tabular-nums">
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {formatElapsed(elapsedSeconds)}
                    </span>
                    <span className="font-semibold text-emerald-300">
                      {score} pts
                    </span>
                  </div>
                </div>

                {/* Question or Post-Answer Scene */}
                {roundResult ? (
                  <div className="mt-6">
                    <RecoveryScene
                      result={roundResult}
                      isLastChallenge={currentIndex >= challenges.length - 1}
                      onContinue={() => void handleContinueAfterScene()}
                    />
                    {finishingRun && (
                      <p className="mt-3 text-center text-xs text-slate-400">
                        Guardando partida en MongoDB Atlas...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
                        Servicio 0{currentChallenge.order} · {currentChallenge.moduleName}
                      </span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        Valor: +{currentChallenge.points} pts
                      </span>
                    </div>

                    <h2 className="mt-2 font-display text-2xl font-semibold text-white text-balance">
                      {currentChallenge.question}
                    </h2>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {currentChallenge.options.map((option, idx) => {
                        const isSelected = selectedOption === idx;
                        const letter = String.fromCharCode(65 + idx);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSelectedOption(idx)}
                            className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                              isSelected
                                ? 'border-emerald-400 bg-emerald-950/50 text-white'
                                : 'border-slate-800 bg-[#0d1322] text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="leading-snug">{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    {currentHint && (
                      <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
                        <span className="font-semibold text-amber-300">Pista: </span>
                        {currentHint}
                      </div>
                    )}

                    {formError && (
                      <p role="alert" className="mt-4 text-xs font-medium text-rose-300">
                        {formError}
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
                      <button
                        type="button"
                        onClick={() => void handleRequestHint()}
                        disabled={Boolean(currentHint) || hintLoading}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                      >
                        {hintLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <HelpCircle className="h-4 w-4" />
                        )}
                        {currentHint ? 'Pista utilizada (-25 pts)' : 'Pedir pista (-25 pts)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSubmitAnswer()}
                        disabled={selectedOption === null || submittingAnswer}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                      >
                        {submittingAnswer ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Comprobando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Responder
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {screen === 'finished' && finalSummary && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-800 bg-[#12192b] p-6 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-400 uppercase">
                        <Sparkles className="h-3.5 w-3.5" />
                        Misión finalizada · {finalSummary.player}
                      </p>
                      <h2 className="mt-1 font-display text-3xl font-bold text-white">
                        {finalSummary.restoredModules.length === 5
                          ? '¡Academia 404 recuperada al completo!'
                          : `Recuperaste ${finalSummary.restoredModules.length} de 5 servicios`}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={handlePlayAgain}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Jugar otra partida
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
                      <p className="text-xs text-slate-400">Puntuación final</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                        {finalSummary.score} pts
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
                      <p className="text-xs text-slate-400">Aciertos</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                        {finalSummary.correctAnswers} / 5
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
                      <p className="text-xs text-slate-400">Pistas utilizadas</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
                        {finalSummary.hintsUsed}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
                      <p className="text-xs text-slate-400">Duración</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                        {formatElapsed(finalSummary.durationSeconds)}
                      </p>
                    </div>
                  </div>
                </section>

                <LeaderboardTable
                  entries={leaderboard}
                  isLoading={leaderboardLoading}
                  isConnected={mongoConnected}
                  onRefresh={() => void fetchLeaderboard()}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
