import { useEffect, useMemo, useState } from "react";
import {
  addJobNote,
  assignJob,
  fetchJobDetail,
  fetchJobs,
  fetchMe,
  fetchTechnicians,
  type Job,
  type JobEvent,
  type JobStatus,
  type Technician,
  updateJobStatus,
  User,
} from "../api/http";
import { JobTable } from "../components/JobTable";
import { JobTimeline } from "../components/JobTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { DemoQuickStart } from "../components/DemoQuickStart";
import {
  Button,
  Card,
  EmptyState,
  PanelHeader,
  Select,
  Skeleton,
  Textarea,
} from "../components/ui";
import {
  subscribeToDispatcherFeed,
  subscribeToJobRoom,
  subscribeToSocketStatus,
} from "../realtime/socket";

const statusOptions: JobStatus[] = [
  "requested",
  "scheduled",
  "on_my_way",
  "on_site",
  "completed",
  "cancelled",
];
const filterOptions: Array<JobStatus | "all"> = [
  "all",
  "requested",
  "scheduled",
  "on_my_way",
  "on_site",
  "completed",
  "cancelled",
];

const DispatcherLoadingSkeleton = () => (
  <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
    <Card title="Jobs" subtitle="Loading jobs...">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
    <Card title="Job Detail" subtitle="Loading details...">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Card>
  </div>
);

export const DispatcherPage = () => {
  const [me, setMe] = useState<User | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<Job | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [statusDraft, setStatusDraft] = useState<JobStatus>("scheduled");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignmentDraft, setAssignmentDraft] = useState<string>("");
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connected" | "disconnected"
  >("disconnected");

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    return subscribeToSocketStatus(setRealtimeStatus);
  }, []);

  useEffect(() => {
    return subscribeToDispatcherFeed({
      onJobCreated: ({ job }) => {
        const shouldShowInCurrentFilter =
          statusFilter === "all" || job.currentStatus === statusFilter;
        if (!shouldShowInCurrentFilter) {
          return;
        }
        setJobs((previous) => {
          if (previous.some((existing) => existing.id === job.id)) {
            return previous;
          }
          return [job, ...previous];
        });
        setSelectedJobId((previous) => previous ?? job.id);
      },
    });
  }, [statusFilter]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobDetail,
    [jobs, selectedJobId, jobDetail],
  );

  const loadJobs = async () => {
    setLoading(true);
    try {
      const user = await fetchMe();
      setMe(user);
      if (user.role !== "dispatcher") {
        setJobs([]);
        setMessage("Current token is not a dispatcher token.");
        return;
      }
      const data = await fetchJobs(
        statusFilter === "all" ? undefined : { status: statusFilter },
      );
      setJobs(data);
      if (!selectedJobId && data.length > 0) {
        setSelectedJobId(data[0].id);
      }
      if (selectedJobId && !data.some((job) => job.id === selectedJobId)) {
        setSelectedJobId(data[0]?.id ?? null);
      }
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load jobs.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (jobId: string) => {
    try {
      const data = await fetchJobDetail(jobId);
      setJobDetail(data.job);
      setEvents(data.events);
      setStatusDraft(data.job.currentStatus);
      setNote("");
      setAssignmentDraft(data.job.assignedTechnicianId ?? "");
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load job detail.",
      );
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [statusFilter]);

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const data = await fetchTechnicians();
        setTechnicians(data);
      } catch {
        setTechnicians([]);
      }
    };
    void loadTechnicians();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }
    void loadDetail(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    return subscribeToJobRoom(selectedJobId, {
      onJobUpdated: ({ job }) => {
        setJobs((previous) =>
          previous.map((existing) =>
            existing.id === job.id ? { ...existing, ...job } : existing,
          ),
        );
        setJobDetail((previous) =>
          previous && previous.id === job.id
            ? { ...previous, ...job }
            : previous,
        );
        setStatusDraft(job.currentStatus);
        setAssignmentDraft(job.assignedTechnicianId ?? "");
        setNote("");
      },
      onJobEvent: ({ event }) => {
        setEvents((previous) => {
          if (previous.some((existing) => existing.id === event.id)) {
            return previous;
          }
          return [...previous, event];
        });
      },
      onDenied: (error) => {
        setMessage(`Realtime subscribe denied: ${error}`);
      },
    });
  }, [selectedJobId]);

  const handleRefresh = async () => {
    await loadJobs();
    if (selectedJobId) {
      await loadDetail(selectedJobId);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedJobId) return;
    setSaving(true);
    try {
      await updateJobStatus(selectedJobId, statusDraft);
      await handleRefresh();
      setMessage("Status updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update status.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedJobId || !note.trim()) return;
    setSaving(true);
    try {
      await addJobNote(selectedJobId, note.trim());
      setNote("");
      await handleRefresh();
      setMessage("Note added.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to add note.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedJobId || !assignmentDraft) return;
    setSaving(true);
    try {
      await assignJob(selectedJobId, assignmentDraft);
      await handleRefresh();
      setMessage("Job assigned.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to assign job.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectFirstJob = () => {
    if (jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dispatcher Workspace
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage jobs, update statuses, and leave internal notes.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Realtime:{" "}
            <span
              className={
                realtimeStatus === "connected"
                  ? "font-semibold text-emerald-700"
                  : "font-semibold text-amber-700"
              }
            >
              {realtimeStatus}
            </span>
          </p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={saving}>
          Refresh
        </Button>
      </header>

      <DemoQuickStart view="dispatcher" />

      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {message}
        </p>
      ) : null}

      {loading ? <DispatcherLoadingSkeleton /> : null}

      {!loading ? (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <Card
            title="Jobs"
            subtitle="Select a job to view details and timeline."
          >
            <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="dispatcher-filter"
              >
                Filter status
              </label>
              <Select
                id="dispatcher-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as JobStatus | "all")
                }
              >
                {filterOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <JobTable
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
            />
          </Card>
          <Card
            title="Job Detail"
            subtitle="Realtime updates appear automatically."
          >
            {!selectedJob ? (
              <EmptyState
                title="No job selected"
                description="Choose a job from the list to view and update details."
                actions={
                  <>
                    <Button
                      variant="secondary"
                      onClick={selectFirstJob}
                      disabled={jobs.length === 0}
                    >
                      Select first job
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => void handleRefresh()}
                    >
                      Refresh jobs
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => (window.location.hash = "client")}
                    >
                      Open client view
                    </Button>
                  </>
                }
              />
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedJob.title}
                    </p>
                    <StatusBadge status={selectedJob.currentStatus} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {selectedJob.customerName}
                  </p>
                  <p className="text-sm text-slate-600">
                    {selectedJob.address}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="dispatcher-status-select"
                  >
                    New status
                  </label>
                  <div />
                  <Select
                    id="dispatcher-status-select"
                    value={statusDraft}
                    onChange={(event) =>
                      setStatusDraft(event.target.value as JobStatus)
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <Button onClick={handleStatusUpdate} disabled={saving}>
                    Update status
                  </Button>
                </div>

                {selectedJob.currentStatus === "requested" ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label
                      className="text-sm font-medium text-slate-700"
                      htmlFor="dispatcher-assign-select"
                    >
                      Assign technician
                    </label>
                    <div />
                    <Select
                      id="dispatcher-assign-select"
                      value={assignmentDraft}
                      onChange={(event) =>
                        setAssignmentDraft(event.target.value)
                      }
                    >
                      <option value="">Select technician</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id}>
                          {technician.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      onClick={handleAssign}
                      disabled={saving || !assignmentDraft}
                    >
                      Assign and schedule
                    </Button>
                  </div>
                ) : null}

                <div className="space-y-2.5">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="dispatcher-note-input"
                  >
                    Add note
                  </label>
                  <Textarea
                    id="dispatcher-note-input"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Add note..."
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={saving || !note.trim()}
                  >
                    Save note
                  </Button>
                </div>

                <PanelHeader
                  title="Timeline"
                  subtitle="Most recent events are shown at the top."
                />
                <JobTimeline events={events} />
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
};
