"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UploadJobStatus = "uploading" | "done" | "error";

export type UploadJob = {
  id: string;
  title: string;
  label: string;
  percent: number;
  status: UploadJobStatus;
  errorMsg?: string;
};

type UploadProgressCtx = {
  jobs: UploadJob[];
  startJob: (id: string, title: string, label: string) => void;
  updateJob: (id: string, percent: number) => void;
  setJobLabel: (id: string, label: string) => void;
  finishJob: (id: string) => void;
  failJob: (id: string, errorMsg: string) => void;
  dismissJob: (id: string) => void;
};

const UploadProgressContext = createContext<UploadProgressCtx | null>(null);

export function UploadProgressProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const startJob = useCallback((id: string, title: string, label: string) => {
    setJobs((prev) => [
      ...prev.filter((j) => j.id !== id),
      { id, title, label, percent: 0, status: "uploading" },
    ]);
  }, []);

  const updateJob = useCallback((id: string, percent: number) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, percent } : j)));
  }, []);

  const setJobLabel = useCallback((id: string, label: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, label } : j)));
  }, []);

  const finishJob = useCallback((id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, percent: 100, status: "done" } : j)),
    );
  }, []);

  const failJob = useCallback((id: string, errorMsg: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "error", errorMsg } : j)),
    );
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const value = useMemo(
    () => ({ jobs, startJob, updateJob, setJobLabel, finishJob, failJob, dismissJob }),
    [jobs, startJob, updateJob, setJobLabel, finishJob, failJob, dismissJob],
  );

  return (
    <UploadProgressContext.Provider value={value}>
      {children}
    </UploadProgressContext.Provider>
  );
}

export function useUploadProgress() {
  const ctx = useContext(UploadProgressContext);
  if (!ctx) throw new Error("useUploadProgress must be used within UploadProgressProvider");
  return ctx;
}
