import type { ReactNode } from "react";

export function CarThumb({
  color,
  label,
}: {
  color: string;
  label?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200">
      <div
        className="mx-auto mt-4 h-16 w-[86%] rounded-t-[28px] rounded-b-xl shadow-inner"
        style={{ background: color }}
      >
        <div className="mx-auto mt-3 h-7 w-[55%] rounded-md bg-sky-200/80" />
      </div>
      <div className="absolute bottom-3 left-4 h-4 w-4 rounded-full bg-slate-800" />
      <div className="absolute right-4 bottom-3 h-4 w-4 rounded-full bg-slate-800" />
      {label ? (
        <p className="pb-2 text-center text-[10px] font-medium text-slate-500">
          {label}
        </p>
      ) : (
        <div className="h-6" />
      )}
    </div>
  );
}

export function Empty({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
      {children}
    </p>
  );
}
