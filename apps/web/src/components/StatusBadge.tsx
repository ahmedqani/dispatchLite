import type { JobStatus } from "../api/http";

const statusClassNames: Record<JobStatus, string> = {
  requested: "bg-violet-100 text-violet-700 ring-violet-200",
  scheduled: "bg-slate-100 text-slate-700 ring-slate-200",
  on_my_way: "bg-sky-100 text-sky-700 ring-sky-200",
  on_site: "bg-amber-100 text-amber-700 ring-amber-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 ring-rose-200"
};

const toLabel = (status: JobStatus): string => status.replaceAll("_", " ");

export const StatusBadge = ({ status }: { status: JobStatus }) => {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ring-1 transition-colors ${statusClassNames[status]}`}
    >
      {toLabel(status)}
    </span>
  );
};
