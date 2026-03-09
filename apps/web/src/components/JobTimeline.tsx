import type { ReactNode } from "react";
import type { JobEvent } from "../api/http";
import { StatusBadge } from "./StatusBadge";

const renderStatus = (status: JobEvent["oldStatus"]): ReactNode => {
  if (!status) {
    return <span className="text-slate-500">-</span>;
  }
  return <StatusBadge status={status} />;
};

const formatEvent = (event: JobEvent): ReactNode => {
  if (event.eventType === "STATUS_CHANGED") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span>Status changed from</span>
        {renderStatus(event.oldStatus)}
        <span>to</span>
        {renderStatus(event.newStatus)}
      </span>
    );
  }
  if (event.eventType === "NOTE_ADDED") {
    return `Note: ${event.noteText ?? ""}`;
  }
  return "Job created";
};

export const JobTimeline = ({ events }: { events: JobEvent[] }) => {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No timeline events yet.</p>;
  }

  const sortedEvents = [...events].sort((a, b) => {
    const byTime = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (byTime !== 0) {
      return byTime;
    }
    return b.id.localeCompare(a.id);
  });

  return (
    <ul className="space-y-3">
      {sortedEvents.map((event) => (
        <li
          key={event.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">{event.eventType}</div>
          </div>
          <div className="mt-1.5 text-sm leading-6 text-slate-800">{formatEvent(event)}</div>
          <div className="mt-1.5 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
};
