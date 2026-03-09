import type { Job } from "../api/http";
import { StatusBadge } from "./StatusBadge";

interface JobTableProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

export const JobTable = ({ jobs, selectedJobId, onSelectJob }: JobTableProps) => {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No jobs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const selected = selectedJobId === job.id;
            return (
              <tr
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectJob(job.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                className={[
                  "cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  selected ? "bg-brand-50" : "hover:bg-slate-50"
                ].join(" ")}
              >
                <td className="border-t border-slate-200 px-4 py-3">
                  <span className="block w-full text-left font-medium text-slate-900">
                    {job.title}
                  </span>
                </td>
                <td className="border-t border-slate-200 px-4 py-3 text-slate-700">{job.customerName}</td>
                <td className="border-t border-slate-200 px-4 py-3">
                  <StatusBadge status={job.currentStatus} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
