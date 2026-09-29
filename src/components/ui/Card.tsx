import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "purple",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: "purple" | "teal" | "orange" | "green" | "blue";
}) {
  const tones = {
    purple: "from-[#6C5CE7] to-[#8B7CFF]",
    teal: "from-[#2EC4B6] to-[#4FD1C5]",
    orange: "from-[#FF8A3D] to-[#FFB347]",
    green: "from-[#22C55E] to-[#4ADE80]",
    blue: "from-[#3B82F6] to-[#60A5FA]",
  };

  return (
    <article className="card flex items-center gap-4 p-4">
      <div
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${tones[tone]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-navy">{value}</p>
        {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      </div>
    </article>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-sm font-semibold text-navy">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
