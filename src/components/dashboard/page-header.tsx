"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title:       string;
  description?: string;
  action?:     ReactNode;   // optional right-side button/content
  backButton?: ReactNode;   // optional back arrow
}

export function PageHeader({ title, description, action, backButton }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div className="flex items-start gap-3">
        {backButton && (
          <div className="mt-1 shrink-0">{backButton}</div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 mt-1">{action}</div>
      )}
    </div>
  );
}