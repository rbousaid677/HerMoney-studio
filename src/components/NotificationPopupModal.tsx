import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Check, ExternalLink, Plus, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { createNotification, deleteNotification } from '../services/notificationService';
import { NotificationAudience } from '../types';

interface NotificationPopupModalProps {
  onNavigate: (path: string) => void;
}

function formatNotificationTime(value: unknown): string {
  if (!value) return 'Just now';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const fn = (value as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') {
      const date = fn();
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return 'Recent';
}

export function NotificationPopupModal({ onNavigate }: NotificationPopupModalProps) {
  const { user, isAdmin } = useAuth();
  const {
    popupOpen,
    closeNotificationPopup,
    showToast,
    publicNotifications,
    readPublicIds,
    unreadPublicCount,
    markPublicRead,
    markAllPublicRead,
    adminNotifications,
    unreadAdminCount,
    markAdminRead,
    markAllAdminRead,
    browserSupported,
    browserAlertsEnabled,
    toggleBrowserAlerts,
  } = useNotifications();

  const [scope, setScope] = useState<'public' | 'admin'>('public');
  const [composeOpen, setComposeOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifAudience, setNotifAudience] = useState<NotificationAudience>('public');
  const [notifLink, setNotifLink] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => {
    if (!isAdmin && scope === 'admin') {
      setScope('public');
      setComposeOpen(false);
    }
  }, [isAdmin, scope]);

  useEffect(() => {
    if (!popupOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeNotificationPopup();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeNotificationPopup, popupOpen]);

  if (!popupOpen) return null;

  const activeItems = scope === 'admin' && isAdmin ? adminNotifications : publicNotifications;
  const activeUnread = scope === 'admin' && isAdmin ? unreadAdminCount : unreadPublicCount;

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('error', 'Missing Details', 'Notification title and message are required.');
      return;
    }

    setSendingNotif(true);
    try {
      await createNotification(
        {
          title: notifTitle,
          message: notifMessage,
          type: notifAudience === 'public' ? 'editorial' : 'system',
          audience: notifAudience,
          link: notifLink,
          read: false,
        },
        user.uid
      );
      setNotifTitle('');
      setNotifMessage('');
      setNotifLink('');
      setComposeOpen(false);
      setScope(notifAudience);
      showToast(
        'success',
        'Notification Sent',
        notifAudience === 'public'
          ? 'Editorial update published to readers.'
          : 'Editorial desk alert saved.'
      );
    } catch (err) {
      showToast(
        'error',
        'Could Not Send',
        err instanceof Error ? err.message : 'Failed to send notification.'
      );
    } finally {
      setSendingNotif(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
      onClick={closeNotificationPopup}
      className="fixed inset-0 z-50 bg-[#1F1B1C]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[86vh] flex flex-col bg-white border border-[#E8E0DF] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Popup Header */}
        <div className="px-5 py-4 bg-[#FCF9F6] border-b border-[#E8E0DF] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F7EAEB] border border-[#E8B4B8]/60 flex items-center justify-center text-[#8E3F4F] shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="notifications-modal-title"
                className="font-serif text-lg font-semibold text-[#1F1B1C] leading-tight"
              >
                Notifications
              </h2>
              <p className="text-xs text-[#5C5355]">
                {activeUnread > 0
                  ? `${activeUnread} unread ${scope === 'admin' ? 'desk alert(s)' : 'editorial update(s)'}`
                  : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeUnread > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (scope === 'admin') {
                    void markAllAdminRead();
                  } else {
                    markAllPublicRead();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#8E3F4F] bg-[#F7EAEB] hover:bg-[#F0DCE0] transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={closeNotificationPopup}
              aria-label="Close notifications popup"
              className="p-2 rounded-lg text-[#5C5355] hover:text-[#1F1B1C] hover:bg-[#F6F0EA] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Scope Tabs + Quick Send Toggle */}
        {isAdmin && (
          <div className="px-5 py-2.5 bg-white border-b border-[#E8E0DF] flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-1 bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg">
              <button
                type="button"
                onClick={() => setScope('public')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  scope === 'public'
                    ? 'bg-white text-[#8E3F4F] shadow-xs'
                    : 'text-[#5C5355] hover:text-[#1F1B1C]'
                }`}
              >
                Readers ({unreadPublicCount})
              </button>
              <button
                type="button"
                onClick={() => setScope('admin')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  scope === 'admin'
                    ? 'bg-white text-[#8E3F4F] shadow-xs'
                    : 'text-[#5C5355] hover:text-[#1F1B1C]'
                }`}
              >
                Editorial Desk ({unreadAdminCount})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setComposeOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#8E3F4F] text-white hover:bg-[#75313F] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{composeOpen ? 'Cancel' : 'Send Notification'}</span>
            </button>
          </div>
        )}

        {/* Inline Admin Notification Composer */}
        {isAdmin && composeOpen && (
          <form
            onSubmit={handleSendNotification}
            className="px-5 py-4 bg-[#FCF9F6] border-b border-[#E8E0DF] space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="popup-notif-title" className="block text-[11px] font-semibold text-[#1F1B1C] mb-1">
                  Headline *
                </label>
                <input
                  id="popup-notif-title"
                  type="text"
                  maxLength={160}
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="New Guide Published"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                />
              </div>
              <div>
                <label htmlFor="popup-notif-audience" className="block text-[11px] font-semibold text-[#1F1B1C] mb-1">
                  Audience
                </label>
                <select
                  id="popup-notif-audience"
                  value={notifAudience}
                  onChange={(e) => setNotifAudience(e.target.value as NotificationAudience)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                >
                  <option value="public">Public Readers</option>
                  <option value="admin">Editorial Desk Only</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="popup-notif-msg" className="block text-[11px] font-semibold text-[#1F1B1C] mb-1">
                Message *
              </label>
              <textarea
                id="popup-notif-msg"
                rows={2}
                maxLength={500}
                required
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Write a concise editorial announcement..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <input
                type="text"
                maxLength={300}
                value={notifLink}
                onChange={(e) => setNotifLink(e.target.value)}
                placeholder="Optional link e.g. /category/freelancing"
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
              />
              <button
                type="submit"
                disabled={sendingNotif}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#8E3F4F] text-white text-xs font-medium hover:bg-[#75313F] disabled:opacity-60 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNotif ? 'Sending...' : 'Publish Alert'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E8E0DF]">
          {activeItems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell className="w-8 h-8 text-[#C59B43] mx-auto mb-3" strokeWidth={1.5} />
              <p className="font-serif text-base font-semibold text-[#1F1B1C]">
                No notifications yet
              </p>
              <p className="text-xs text-[#5C5355] mt-1.5 max-w-xs mx-auto leading-relaxed">
                {scope === 'admin'
                  ? 'Editorial activity alerts will appear here in real time.'
                  : 'Newly published articles and magazine announcements will appear here automatically.'}
              </p>
            </div>
          ) : (
            activeItems.map((item) => {
              const isUnread = scope === 'admin' ? !item.read : !readPublicIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`px-5 py-4 transition-colors ${
                    isUnread ? 'bg-[#FCF9F6]' : 'bg-white'
                  } hover:bg-[#F7EAEB]/35`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#8E3F4F] shrink-0"
                            aria-label="Unread"
                          />
                        )}
                        <h3 className="text-sm font-semibold text-[#1F1B1C] leading-snug">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-xs text-[#5C5355] mt-1 leading-relaxed">{item.message}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-[11px] font-mono text-[#5C5355]">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                        {item.link && (
                          <a
                            href={item.link}
                            onClick={(e) => {
                              e.preventDefault();
                              if (scope === 'admin') {
                                void markAdminRead(item.id, true);
                              } else {
                                markPublicRead(item.id);
                              }
                              closeNotificationPopup();
                              onNavigate(item.link);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#8E3F4F] hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {(isUnread || scope === 'admin') && (
                          <button
                            type="button"
                            onClick={() => {
                              if (scope === 'admin') {
                                void markAdminRead(item.id, !item.read);
                              } else {
                                markPublicRead(item.id);
                              }
                            }}
                            className="text-xs font-medium text-[#5C5355] hover:text-[#8E3F4F] cursor-pointer"
                          >
                            {scope === 'admin' && item.read ? 'Mark unread' : 'Mark read'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        aria-label="Delete notification"
                        onClick={() =>
                          void deleteNotification(item.id).then(() =>
                            showToast('success', 'Deleted', 'Notification removed.')
                          )
                        }
                        className="p-1.5 text-[#5C5355] hover:text-[#9E2A3B] rounded-lg hover:bg-[#F7EAEB] cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Popup Footer */}
        <div className="px-5 py-3 bg-[#FCF9F6] border-t border-[#E8E0DF] flex items-center justify-between gap-3">
          {browserSupported ? (
            <button
              type="button"
              onClick={() => void toggleBrowserAlerts()}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                browserAlertsEnabled
                  ? 'bg-[#F4EAD5]/70 border-[#C59B43] text-[#1F1B1C]'
                  : 'bg-white border-[#E8E0DF] text-[#5C5355] hover:text-[#1F1B1C]'
              }`}
            >
              <BellRing className="w-3.5 h-3.5 text-[#C59B43]" />
              <span>
                Browser Alerts: {browserAlertsEnabled ? 'Enabled' : 'Enable'}
              </span>
            </button>
          ) : (
            <span className="text-xs text-[#5C5355]">Live updates active</span>
          )}

          <button
            type="button"
            onClick={closeNotificationPopup}
            className="px-4 py-1.5 rounded-lg border border-[#E8E0DF] bg-white text-xs font-medium text-[#1F1B1C] hover:bg-[#F6F0EA] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
