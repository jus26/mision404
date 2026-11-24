import {
  Award,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Lock,
  MonitorCheck,
  Users,
} from 'lucide-react';
import { ModuleId } from '../types';

interface ServiceSpec {
  id: ModuleId;
  number: string;
  name: string;
  problem: string;
  accentRing: string;
  accentBg: string;
  accentText: string;
  icon: typeof KeyRound;
}

const SERVICES: ServiceSpec[] = [
  {
    id: 'acceso',
    number: '01',
    name: 'Acceso',
    problem: 'Puerta digital cerrada',
    accentRing: 'border-rose-400/60',
    accentBg: 'bg-rose-500/15',
    accentText: 'text-rose-300',
    icon: KeyRound,
  },
  {
    id: 'matriculas',
    number: '02',
    name: 'Matrículas',
    problem: 'Listado no disponible',
    accentRing: 'border-amber-400/60',
    accentBg: 'bg-amber-500/15',
    accentText: 'text-amber-300',
    icon: Users,
  },
  {
    id: 'horarios',
    number: '03',
    name: 'Horarios',
    problem: 'Calendario desordenado',
    accentRing: 'border-emerald-400/60',
    accentBg: 'bg-emerald-500/15',
    accentText: 'text-emerald-300',
    icon: CalendarClock,
  },
  {
    id: 'aula_virtual',
    number: '04',
    name: 'Aula virtual',
    problem: 'Enlace sospechoso activo',
    accentRing: 'border-sky-400/60',
    accentBg: 'bg-sky-500/15',
    accentText: 'text-sky-300',
    icon: MonitorCheck,
  },
  {
    id: 'certificados',
    number: '05',
    name: 'Certificados',
    problem: 'Verificación detenida',
    accentRing: 'border-violet-400/60',
    accentBg: 'bg-violet-500/15',
    accentText: 'text-violet-300',
    icon: Award,
  },
];

interface ControlCenterPanelProps {
  restoredModules: ModuleId[];
  activeModuleId?: ModuleId | null;
  statusMessage?: string;
}

export function ControlCenterPanel({
  restoredModules,
  activeModuleId,
  statusMessage,
}: ControlCenterPanelProps) {
  const recoveredCount = restoredModules.length;

  const defaultStatus =
    recoveredCount === 0
      ? 'Supera una misión para recuperar el primer servicio.'
      : recoveredCount === 5
        ? 'Sistema completo restablecido: los 5 servicios de la academia están en línea.'
        : `${recoveredCount} de 5 servicios recuperados. Continúa con la siguiente misión.`;

  return (
    <section
      aria-label="Centro de control de la Academia 404"
      className="rounded-2xl border border-slate-800 bg-[#12192b] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-sm font-semibold tracking-wider text-slate-200 uppercase">
          Centro de control · Academia 404
        </h2>
        <p className="font-mono text-xs font-medium text-slate-300 tabular-nums">
          {recoveredCount} DE 5 SERVICIOS RECUPERADOS
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SERVICES.map((service) => {
          const isRestored = restoredModules.includes(service.id);
          const isCurrent = activeModuleId === service.id;
          const Icon = service.icon;

          return (
            <div
              key={service.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-colors duration-200 ${
                isRestored
                  ? 'border-emerald-500/70 bg-emerald-950/35'
                  : isCurrent
                    ? `${service.accentRing} bg-slate-900/90`
                    : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-semibold tabular-nums ${
                    isRestored
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : `${service.accentBg} ${service.accentText}`
                  }`}
                >
                  {service.number}
                </span>
                <Icon
                  className={`h-4 w-4 ${
                    isRestored ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                />
              </div>

              <div className="mt-4">
                <p className="font-display text-base font-semibold tracking-tight text-white">
                  {service.name}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {isRestored ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Recuperado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                      Bloqueado
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#0d1322] px-4 py-3 text-xs text-slate-300 sm:text-sm">
        <span className="font-mono font-semibold text-slate-400">ESTADO:</span>{' '}
        <span>{statusMessage || defaultStatus}</span>
      </div>
    </section>
  );
}
