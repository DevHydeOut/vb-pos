import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center
          text-4xl font-bold text-muted-foreground">
          404
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal"
            className="px-4 py-2.5 border border-border rounded-xl text-sm
              hover:bg-muted transition-colors">
            Go to Portal
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 bg-foreground text-background rounded-xl
              text-sm font-medium hover:opacity-90 transition-opacity">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}