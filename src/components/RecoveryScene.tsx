import {
  AlertCircle,
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AnswerResponse, ModuleId } from '../types';

interface RecoverySceneProps {
  result: AnswerResponse;
  isLastChallenge: boolean;
  onContinue: () => void;
}

function ModuleVisualPreview({ moduleId }: { moduleId: ModuleId }) {
  switch (moduleId) {
    case 'acceso':
      return (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-100">
          <div className="flex items-center gap-2 font-medium text-emerald-300">
            <DoorOpen className="h-4 w-4" />
            Puerta digital abierta · Perfil de consulta activo
          </div>
          <p className="mt-2 font-mono text-slate-300">
            rol: consulta · permisos: [lectura] · escritura: deshabilitada
          </p>
        </div>
      );
    case 'matriculas':
      return (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-100">
          <div className="flex items-center gap-2 font-medium text-emerald-300">
            <Users className="h-4 w-4" />
            Listado de alumnado inscrito restaurado
          </div>
          <p className="mt-2 font-mono text-slate-300">
            ID #ALU-1042 · Ana López · Estado: Matriculada
          </p>
        </div>
      );
    case 'horarios':
      return (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-100">
          <div className="flex items-center gap-2 font-medium text-emerald-300">
            <CalendarClock className="h-4 w-4" />
            Calendario semanal en línea
          </div>
          <p className="mt-2 font-mono text-slate-300">
            Bases de Datos · Martes 10:00 · Aula 2B
          </p>
        </div>
      );
    case 'aula_virtual':
      return (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-100">
          <div className="flex items-center gap-2 font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Enlace sospechoso bloqueado · Aula virtual operativa
          </div>
          <p className="mt-2 font-mono text-slate-300">
            filtro_phishing: activo · dominio verificado: academia404.edu
          </p>
        </div>
      );
    case 'certificados':
      return (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4 text-xs text-emerald-100">
          <div className="flex items-center gap-2 font-medium text-emerald-300">
            <Award className="h-4 w-4" />
            Verificación oficial activada
          </div>
          <p className="mt-2 font-mono text-slate-300">
            código_verificación: CERT-404-VERIFICADO · Curso completado
          </p>
        </div>
      );
  }
}

export function RecoveryScene({
  result,
  isLastChallenge,
  onContinue,
}: RecoverySceneProps) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        result.correct
          ? 'border-emerald-500/50 bg-[#101e23]'
          : 'border-amber-500/40 bg-[#1a1822]'
      }`}
    >
      <div className="flex items-start gap-3">
        {result.correct ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
        ) : (
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold tracking-wide uppercase ${
              result.correct ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {result.correct
              ? `Servicio recuperado: ${result.moduleName} (+100 puntos)`
              : `El servicio ${result.moduleName} sigue bloqueado`}
          </p>

          <h3 className="mt-1 font-display text-xl font-semibold text-white">
            {result.correct
              ? `¡${result.moduleName} vuelve a estar en marcha!`
              : 'Concepto clave para esta misión'}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            {result.correct ? result.restoredMessage : result.explanation}
          </p>

          {result.correct && (
            <div className="mt-4">
              <ModuleVisualPreview moduleId={result.moduleId} />
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap"
            >
              {isLastChallenge ? 'Ver resultado final' : 'Siguiente misión'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
