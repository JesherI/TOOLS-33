import { useState } from "react";
import { skipVersion, postponeUpdate, downloadAndInstall } from "../../utils/updater";

interface UpdateDialogProps {
  version: string;
  releaseNotes?: string;
  onClose: () => void;
}

export function UpdateDialog({ version, releaseNotes, onClose }: UpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await downloadAndInstall();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    skipVersion(version);
    onClose();
  };

  const handlePostpone = () => {
    postponeUpdate(24);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {}}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-b from-gray-900 to-black border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/20 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500/30 to-orange-600/10 rounded-xl flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-500/20">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-bounce"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nueva Actualización</h2>
              <p className="text-sm text-orange-400">Versión {version}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Notas de la versión:</p>
            <div className="bg-black/40 rounded-lg p-4 max-h-40 overflow-y-auto border border-white/5">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {releaseNotes || "Mejoras de rendimiento y correcciones de errores."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>La aplicación se reiniciará para completar la actualización.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative p-4 pt-2 border-t border-white/10 bg-black/20">
          <div className="flex flex-col gap-3">
            {/* Primary button */}
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Descargando...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Actualizar Ahora</span>
                </>
              )}
            </button>

            {/* Secondary buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePostpone}
                disabled={isUpdating}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                Más Tarde
              </button>
              <button
                onClick={handleSkip}
                disabled={isUpdating}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                Omitir Esta Versión
              </button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
}
