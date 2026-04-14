"use client";

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export default function Skeleton({
  width = "100%",
  height = "16px",
  borderRadius = "8px",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width, height, borderRadius, background: "#E2E8F0" }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-[--color-card] p-5 ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <Skeleton width="40%" height="12px" className="mb-3" />
      <Skeleton width="60%" height="32px" className="mb-2" />
      <Skeleton width="50%" height="12px" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <Skeleton width="56px" height="12px" />
      <Skeleton width="100%" height="14px" />
      <Skeleton width="60px" height="20px" borderRadius="9999px" />
    </div>
  );
}
