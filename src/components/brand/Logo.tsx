export function Logo({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#4CC9F0] to-[#4361EE] shadow-lg shadow-cyan-500/20">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M12 2.2c3.6 4.6 7.5 8.4 7.5 12a7.5 7.5 0 1 1-15 0c0-3.6 3.9-7.4 7.5-12Z" />
        </svg>
      </span>
      {!compact && (
        <div className="leading-tight">
          <p
            className={`text-[15px] font-bold tracking-tight ${light ? "text-white" : "text-navy"}`}
          >
            LavApp
          </p>
          <p
            className={`text-[10px] ${light ? "text-white/60" : "text-slate-400"}`}
          >
            Gestión inteligente
          </p>
        </div>
      )}
    </div>
  );
}
