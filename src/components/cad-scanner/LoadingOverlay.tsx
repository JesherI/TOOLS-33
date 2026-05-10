interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40
      flex items-center justify-center rounded-2xl">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-orange-500/30 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-orange-500 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}
