"use client";

import { useState }  from "react";
import { Bell, X, Megaphone } from "lucide-react";

interface Notification {
  id:        string;
  title:     string;
  message:   string;
  time:      string;
  read:      boolean;
  type:      "info" | "warning" | "success";
}

// Placeholder — replace with real DB fetch later
const MOCK_NOTIFICATIONS: Notification[] = [];

export function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      {/* Sidebar row style bell button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors relative"
      >
        <div className="relative">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </div>
        <span>Notifications</span>
        {unread > 0 && (
          <span className="ml-auto bg-foreground text-background text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel — slides in from right */}
      <div className={`
        fixed top-3 right-3 bottom-3 w-96 z-50 bg-background border border-border
        flex flex-col shadow-2xl rounded-3xl overflow-hidden
        transition-all duration-300 ease-out
        ${open ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0"}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Notifications</h2>
            {unread > 0 && (
              <span className="bg-foreground text-background text-xs font-bold px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent hover:bg-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full pb-16 text-center px-6">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4">
                <Megaphone className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">You're up to date!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No new notifications right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div key={notif.id}
                  className={`px-6 py-4 hover:bg-accent/50 transition-colors ${!notif.read ? "bg-accent/30" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-foreground rounded-full mt-1.5 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{notif.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}