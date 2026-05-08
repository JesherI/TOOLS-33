export interface AlertState {
  show: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "error" | "confirm";
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertModalProps {
  alert: AlertState;
  onClose: () => void;
}

export function AlertModal({ alert, onClose }: AlertModalProps) {
  if (!alert.show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-orange-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            alert.type === "error" ? "bg-red-500/20" :
            alert.type === "success" ? "bg-green-500/20" :
            "bg-orange-500/20"
          }`}>
            {alert.type === "error" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : alert.type === "success" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
        </div>
        <p className="text-gray-300 mb-6 whitespace-pre-line">{alert.message}</p>
        <div className="flex justify-end gap-3">
          {alert.type === "confirm" ? (
            <>
              <button
                onClick={() => { onClose(); alert.onCancel?.(); }}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onClose(); alert.onConfirm?.(); }}
                className="px-4 py-2 rounded-lg bg-orange-500 text-black font-medium hover:bg-orange-600 transition-colors"
              >
                Confirmar
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-orange-500 text-black font-medium hover:bg-orange-600 transition-colors"
            >
              Aceptar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
