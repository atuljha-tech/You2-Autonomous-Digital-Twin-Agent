import React from 'react';

export const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-[var(--surface2)] rounded-2xl border border-[var(--border-color)] ${className || 'h-32 w-full'}`} />
);

export const SkeletonText = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-[var(--surface2)] rounded-md ${className || 'h-4 w-3/4'}`} />
);

export const SkeletonCircle = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-[var(--surface2)] rounded-full ${className || 'h-12 w-12'}`} />
);

export const DashboardSkeleton = () => (
  <div className="flex flex-col lg:flex-row gap-6 w-full animate-fade-in py-8 px-6">
     <div className="flex-1 space-y-6">
        <SkeletonText className="h-8 w-1/4 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <SkeletonBox className="h-32 w-full" />
           <SkeletonBox className="h-32 w-full" />
           <SkeletonBox className="h-32 w-full" />
           <SkeletonBox className="h-32 w-full" />
        </div>
        <SkeletonBox className="h-72 w-full" />
     </div>
     <div className="w-full lg:w-80 space-y-6">
        <SkeletonBox className="h-48 w-full" />
        <SkeletonBox className="h-48 w-full" />
     </div>
  </div>
);
