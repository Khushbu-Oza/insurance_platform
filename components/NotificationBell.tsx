"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type NotificationBellProps = {
  fallbackCount?: number;
};

export function NotificationBell({ fallbackCount = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load notifications.");
      }
      setItems(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!open) return;
    loadNotifications();
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((item) => item.is_read === false).length,
    [items],
  );

  async function markRead(id: string) {
    const current = items.find((item) => item.id === id);
    if (!current || current.is_read) return;
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (!response.ok) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item,
        ),
      );
    } catch {
      // noop
    }
  }

  const badgeCount = unreadCount || fallbackCount;

  return (
    <div className="notification-wrap">
      <button
        type="button"
        className="topbar-bell"
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell size={15} />
        {badgeCount > 0 && <span className="topbar-bell-badge">{badgeCount}</span>}
      </button>

      {open ? (
        <div className="notification-panel glass-card">
          <div className="notification-head">
            <strong>Notifications</strong>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          {loading ? <p className="kpi-foot">Loading...</p> : null}
          {error ? <p className="inline-error">{error}</p> : null}

          {!loading && !error && items.length === 0 ? (
            <p className="kpi-foot">No notifications right now.</p>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <ul className="notification-list">
              {items.map((item) => (
                <li key={item.id} className={`notification-item${item.is_read ? "" : " unread"}`}>
                  <div>
                    <p className="notification-title">{item.title}</p>
                    <p className="kpi-foot">{item.message}</p>
                  </div>
                  {!item.is_read ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => markRead(item.id)}
                    >
                      Mark Read
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
