import { useEffect, useMemo, useState } from "react";
import {
  addJobNote,
  fetchJobDetail,
  fetchJobs,
  fetchMe,
  type Job,
  type JobEvent,
  type JobStatus,
  type User,
  updateJobStatus
} from "../api/http";
import { JobTimeline } from "../components/JobTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { DemoQuickStart } from "../components/DemoQuickStart";
import { Button, Card, EmptyState, PanelHeader, Select, Skeleton, Textarea } from "../components/ui";
import { setBearerToken } from "../auth/tokenStore";
import { subscribeToJobRoom, subscribeToSocketStatus } from "../realtime/socket";

const statusOptions: JobStatus[] = ["scheduled", "on_my_way", "on_site", "completed", "cancelled"];

const TechnicianLoadingSkeleton = () => (
  <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
    <Card title="My Jobs" subtitle="Loading assigned jobs...">
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
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

export const TechnicianPage = () => {
  const [me, setMe] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<Job | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [statusDraft, setStatusDraft] = useState<JobStatus>("scheduled");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected">("disconnected");

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

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobDetail,
    [jobs, selectedJobId, jobDetail]
  );

  const load = async () => {
    setLoading(true);
    try {
      const user = await fetchMe();
      setMe(user);
      if (user.role !== "technician" || !user.technicianId) {
        setJobs([]);
        setMessage("Current token is not a technician token.");
        return;
      }
      const assignedJobs = await fetchJobs({ technicianId: user.technicianId });
      setJobs(assignedJobs);
      if (!selectedJobId && assignedJobs.length > 0) {
        setSelectedJobId(assignedJobs[0].id);
      }
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load technician context.");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (jobId: string) => {
    try {
      const data = await fetchJobDetail(jobId);
      setJobDetail(data.job);
      setEvents(data.events);
      setStatusDraft(data.job.currentStatus === "requested" ? "scheduled" : data.job.currentStatus);
      setNote("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load job detail.");
    }
  };

  useEffect(() => {
    void load();
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
        setJobs((previous) => previous.map((existing) => (existing.id === job.id ? { ...existing, ...job } : existing)));
        setJobDetail((previous) => (previous && previous.id === job.id ? { ...previous, ...job } : previous));
        setStatusDraft(job.currentStatus === "requested" ? "scheduled" : job.currentStatus);
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
      }
    });
  }, [selectedJobId]);

  const canMutate = Boolean(
    me?.role === "technician" && me.technicianId && selectedJob?.assignedTechnicianId === me.technicianId
  );

  const refresh = async () => {
    await load();
    if (selectedJobId) {
      await loadDetail(selectedJobId);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedJobId || !canMutate) return;
    setSaving(true);
    try {
      await updateJobStatus(selectedJobId, statusDraft);
      await refresh();
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedJobId || !note.trim() || !canMutate) return;
    setSaving(true);
    try {
      await addJobNote(selectedJobId, note.trim());
      setNote("");
      await refresh();
      setMessage("Note added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Note append failed.");
    } finally {
      setSaving(false);
    }
  };

  const selectFirstJob = () => {
    if (jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  };

  const switchTokenAndReload = (token: string, hash: string) => {
    setBearerToken(token);
    window.location.hash = hash;
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Technician Workspace</h2>
          <p className="mt-1 text-sm text-slate-500">View your assigned jobs and update progress in real time.</p>
          <p className="mt-1 text-xs text-slate-500">
            Realtime:{" "}
            <span className={realtimeStatus === "connected" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
              {realtimeStatus}
            </span>
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={saving}>
          Refresh
        </Button>
      </header>

      <DemoQuickStart view="technician" />

      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{message}</p>
      ) : null}
      {loading ? <TechnicianLoadingSkeleton /> : null}

      {!loading ? (
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <Card title="My Jobs" subtitle="Only jobs assigned to your technician ID.">
            {jobs.length === 0 ? (
              <EmptyState
                title="No assigned jobs"
                description="When jobs are assigned to you, they will appear here."
                actions={
                  <>
                    <Button variant="secondary" onClick={() => switchTokenAndReload("demo-ava-token", "technician")}>
                      Use Ava token
                    </Button>
                    <Button variant="secondary" onClick={() => switchTokenAndReload("demo-ben-token", "technician")}>
                      Use Ben token
                    </Button>
                    <Button variant="ghost" onClick={() => switchTokenAndReload("demo-dispatcher-token", "dispatcher")}>
                      Switch to dispatcher
                    </Button>
                  </>
                }
              />
            ) : (
              <ul className="space-y-2">
                {jobs.map((job) => {
                  const selected = selectedJobId === job.id;
                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className={[
                          "w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                          selected
                            ? "border-brand-200 bg-brand-50 shadow-sm"
                            : "border-slate-200 bg-white hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                        ].join(" ")}
                      >
                        <p className="font-medium text-slate-900">{job.title}</p>
                        <div className="mt-2">
                          <StatusBadge status={job.currentStatus} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="Job Detail" subtitle="Mutation controls are guarded by assignment checks.">
            {!selectedJob ? (
              <EmptyState
                title="No job selected"
                description="Select a job from your list to view details."
                actions={
                  <>
                    <Button variant="secondary" onClick={selectFirstJob} disabled={jobs.length === 0}>
                      Select first job
                    </Button>
                    <Button variant="ghost" onClick={() => void refresh()}>
                      Refresh jobs
                    </Button>
                  </>
                }
              />
            ) : (
              <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-slate-900">{selectedJob.title}</p>
                  <StatusBadge status={selectedJob.currentStatus} />
                </div>
                <p className="text-sm text-slate-600">{selectedJob.customerName}</p>
                <p className="text-sm text-slate-600">{selectedJob.address}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Mutations allowed: <span className="font-semibold">{canMutate ? "yes" : "no"}</span> (role/assignment guard)
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm font-medium text-slate-700" htmlFor="technician-status-select">
                  New status
                </label>
                <div />
                <Select
                  id="technician-status-select"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value as JobStatus)}
                  disabled={!canMutate}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
                <Button onClick={handleStatusUpdate} disabled={saving || !canMutate}>
                  Update status
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="technician-note-input">
                  Add note
                </label>
                <Textarea
                  id="technician-note-input"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add note..."
                  disabled={!canMutate}
                />
                <Button onClick={handleAddNote} disabled={saving || !canMutate || !note.trim()}>
                  Save note
                </Button>
              </div>

              <PanelHeader title="Timeline" subtitle="Recent timeline events for this job." />
              <JobTimeline events={events} />
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
};
