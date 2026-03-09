import { useEffect, useMemo, useState } from "react";
import {
  createJobRequest,
  fetchClientJobDetail,
  fetchClientJobs,
  type CreateJobRequestPayload,
  type Job,
  type JobEvent
} from "../api/http";
import { DemoQuickStart } from "../components/DemoQuickStart";
import { JobTable } from "../components/JobTable";
import { JobTimeline } from "../components/JobTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { Button, Card, EmptyState, Input, PanelHeader, Textarea } from "../components/ui";
import { subscribeToJobRoom, subscribeToSocketStatus } from "../realtime/socket";

const defaultRequestForm: CreateJobRequestPayload = {
  title: "",
  description: ""
};

export const ClientPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<Job | null>(null);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [requestForm, setRequestForm] = useState<CreateJobRequestPayload>(defaultRequestForm);
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
  const subscribedJobIdsKey = useMemo(() => jobs.map((job) => job.id).sort().join("|"), [jobs]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const myJobs = await fetchClientJobs();
      setJobs(myJobs);
      if (!selectedJobId && myJobs.length > 0) {
        setSelectedJobId(myJobs[0].id);
      }
      setMessage(null);
    } catch (error) {
      const fallback = "Failed to load your jobs. Use Client 1/2 token from Demo Start.";
      setMessage(error instanceof Error ? `${error.message} If needed, switch to a client token.` : fallback);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (jobId: string) => {
    try {
      const data = await fetchClientJobDetail(jobId);
      setJobDetail(data.job);
      setEvents(data.events);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load job details.");
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null);
      setEvents([]);
      return;
    }
    void loadDetail(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (jobs.length === 0) {
      return;
    }

    const unsubscribers = jobs.map((job) =>
      subscribeToJobRoom(job.id, {
        onJobUpdated: ({ job: updatedJob }) => {
          setJobs((previous) =>
            previous.map((existing) => (existing.id === updatedJob.id ? { ...existing, ...updatedJob } : existing))
          );
          setJobDetail((previous) => (previous && previous.id === updatedJob.id ? { ...previous, ...updatedJob } : previous));
        },
        onJobEvent: ({ event }) => {
          if (event.jobId !== selectedJobId) {
            return;
          }
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
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [subscribedJobIdsKey, selectedJobId]);

  const handleCreateRequest = async () => {
    if (!requestForm.title.trim()) {
      setMessage("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateJobRequestPayload = {
        title: requestForm.title.trim(),
        description: requestForm.description?.trim(),
        appointmentStart: requestForm.appointmentStart?.trim(),
        appointmentEnd: requestForm.appointmentEnd?.trim()
      };
      const { job } = await createJobRequest(payload);
      setRequestForm(defaultRequestForm);
      await loadJobs();
      setSelectedJobId(job.id);
      setMessage("Request submitted.");
    } catch (error) {
      const fallback = "Failed to submit request. This action requires a client token.";
      setMessage(error instanceof Error ? `${error.message} If needed, switch to a client token.` : fallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Client Workspace</h2>
          <p className="mt-1 text-sm text-slate-500">Create service requests and track your job progress.</p>
          <p className="mt-1 text-xs text-slate-500">
            Realtime:{" "}
            <span className={realtimeStatus === "connected" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
              {realtimeStatus}
            </span>
          </p>
        </div>
        <Button variant="secondary" onClick={() => void loadJobs()} disabled={saving}>
          Refresh
        </Button>
      </header>

      <DemoQuickStart view="client" />

      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{message}</p>
      ) : null}

      <Card
        title="Create Job Request"
        subtitle="Submit a new request for dispatcher triage and assignment. Name, phone, and service address come from your client profile."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="client-title">
              Request title
            </label>
            <Input
              id="client-title"
              value={requestForm.title}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="e.g. Dryer not heating"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="client-appointment-start">
              Preferred start (optional)
            </label>
            <Input
              id="client-appointment-start"
              type="datetime-local"
              value={requestForm.appointmentStart ?? ""}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, appointmentStart: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="client-appointment-end">
              Preferred end (optional)
            </label>
            <Input
              id="client-appointment-end"
              type="datetime-local"
              value={requestForm.appointmentEnd ?? ""}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, appointmentEnd: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="client-description">
              Description (optional)
            </label>
            <Textarea
              id="client-description"
              rows={3}
              value={requestForm.description}
              onChange={(event) => setRequestForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe the issue..."
            />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={handleCreateRequest} disabled={saving}>
            Submit request
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Card title="My Requests" subtitle="Only requests created by your client user.">
          {loading ? (
            <p className="text-sm text-slate-500">Loading requests...</p>
          ) : (
            <JobTable jobs={jobs} selectedJobId={selectedJobId} onSelectJob={setSelectedJobId} />
          )}
        </Card>

        <Card title="Request Detail" subtitle="Read-only status and timeline.">
          {!selectedJob ? (
            <EmptyState
              title="No request selected"
              description="Select a request from the list to see details and timeline."
              actions={
                <Button variant="secondary" onClick={() => void loadJobs()}>
                  Refresh requests
                </Button>
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
              </div>
              <PanelHeader title="Timeline" subtitle="Recent events for this request." />
              <JobTimeline events={events} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
