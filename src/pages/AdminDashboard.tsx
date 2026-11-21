import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  PenSquare,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_NAMES, INITIAL_ARTICLE_SLOT_COUNT } from '../constants/categories';
import { useAdSense } from '../context/AdSenseContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  deleteArticle,
  getAllArticlesForAdmin,
  saveArticle,
  updateArticleStatus,
} from '../services/articleService';
import {
  buildBackupPayload,
  deleteBackupRecord,
  downloadBackupJson,
  getBackupHistory,
  getLastLocalBackupTimestamp,
  recordBackupSnapshot,
  restoreArticlesFromBackup,
} from '../services/backupService';
import { uploadArticleImageDetailed } from '../services/imageService';
import { publishArticleNotifications } from '../services/notificationService';
import {
  deleteContactMessage,
  getContactMessages,
  isValidPublisherId,
  saveAdSenseSettings,
} from '../services/settingsService';
import {
  AdPlacementKey,
  AdSenseSettings,
  Article,
  ArticleInput,
  ArticleStatus,
  BackupRecord,
  CategoryName,
  ContactMessage,
} from '../types';
import { extractTableOfContents } from '../utils/htmlUtils';
import {
  applySeoMetadata,
  autoGenerateExcerpt,
  autoGenerateMetaDescription,
  autoGenerateSeoTitle,
  generateSitemapXml,
  generateSlug,
  getCanonicalBaseUrl,
} from '../utils/seo';
import { AdminLogin } from '../components/AdminLogin';
import { BrandLogo } from '../components/BrandLogo';
import { RichTextEditor } from '../components/RichTextEditor';
import { SafeImage } from '../components/SafeImage';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

type AdminTab =
  | 'articles'
  | 'editor'
  | 'adsense'
  | 'seo'
  | 'backups'
  | 'inbox'
  | 'setup';

const PLACEMENT_META: Array<{ key: AdPlacementKey; label: string; description: string }> = [
  {
    key: 'headerBanner',
    label: 'Header Banner',
    description: 'Optional top-of-page banner below the fixed navigation bar.',
  },
  {
    key: 'homeMidSection',
    label: 'Homepage Mid-Section',
    description: 'Appears between the category strip and the three-column article grid.',
  },
  {
    key: 'categoryTop',
    label: 'Category Page Top',
    description: 'Appears below the category header before the featured story.',
  },
  {
    key: 'inArticle',
    label: 'In-Article Unit',
    description: 'Appears cleanly below the main article reading body before tags.',
  },
  {
    key: 'footerBanner',
    label: 'Footer Banner',
    description: 'Optional horizontal unit directly above the site footer.',
  },
];

function createBlankForm(authorName: string): ArticleInput & { tagsText: string } {
  return {
    title: '',
    slug: '',
    category: 'Make Money Online',
    coverImage: '',
    content: '<p></p>',
    excerpt: '',
    metaDescription: '',
    seoTitle: '',
    canonicalUrl: '',
    tags: [],
    tagsText: '',
    author: authorName || 'HerMoney Editorial',
    publicationDate: new Date().toISOString().slice(0, 10),
    status: 'draft',
  };
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, loading: authLoading, isAdmin, adminCheckPending, signOut } = useAuth();
  const { settings: liveAdSense, refreshSettings: refreshAdSense } = useAdSense();
  const { showToast, unreadAdminCount, openNotificationPopup } = useNotifications();

  const [activeTab, setActiveTab] = useState<AdminTab>('articles');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  // Editor state
  const [editingArticleId, setEditingArticleId] = useState<string | undefined>(undefined);
  const [editorSessionKey, setEditorSessionKey] = useState('new-0');
  const [form, setForm] = useState<ArticleInput & { tagsText: string }>(() =>
    createBlankForm(user?.displayName || 'HerMoney Editorial')
  );
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [seoTitleManuallyEdited, setSeoTitleManuallyEdited] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverFeedback, setCoverFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // AdSense state
  const [adForm, setAdForm] = useState<AdSenseSettings>(liveAdSense);
  const [savingAdSense, setSavingAdSense] = useState(false);

  // Backups state
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [backupLabel, setBackupLabel] = useState('');
  const [lastLocalBackup, setLastLocalBackup] = useState<string | null>(() =>
    getLastLocalBackupTimestamp()
  );
  const [runningBackup, setRunningBackup] = useState(false);

  // Contact inbox state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Feedback toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    applySeoMetadata({
      title: 'Editorial Desk | HerMoney Studio',
      description: 'HerMoney Studio article management and administration workspace.',
      canonicalPath: '/admin',
      noIndex: true,
    });
  }, []);

  useEffect(() => {
    setAdForm(liveAdSense);
  }, [liveAdSense]);

  const loadDashboardData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingArticles(true);
    setLoadingMessages(true);
    try {
      const [allArticles, allBackups, allMessages] = await Promise.all([
        getAllArticlesForAdmin(),
        getBackupHistory().catch(() => []),
        getContactMessages().catch(() => []),
      ]);
      setArticles(allArticles);
      setBackupHistory(allBackups);
      setMessages(allMessages);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load dashboard data.',
      });
    } finally {
      setLoadingArticles(false);
      setLoadingMessages(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      void loadDashboardData();
    }
  }, [isAdmin, loadDashboardData]);

  function notify(type: 'success' | 'error', text: string) {
    setFeedback({ type, text });
    showToast(type, type === 'success' ? 'Updated' : 'Action Failed', text);
  }

  function startNewArticle() {
    setEditingArticleId(undefined);
    setSlugManuallyEdited(false);
    setSeoTitleManuallyEdited(false);
    setForm(createBlankForm(user?.displayName || 'HerMoney Editorial'));
    setEditorSessionKey(`new-${Date.now()}`);
    setActiveTab('editor');
    setMobileSidebarOpen(false);
    setFeedback(null);
    setCoverFeedback(null);
  }

  function startEditArticle(article: Article) {
    setEditingArticleId(article.id);
    setSlugManuallyEdited(true);
    setSeoTitleManuallyEdited(Boolean(article.seoTitle));
    setForm({
      title: article.title,
      slug: article.slug,
      category: article.category,
      coverImage: article.coverImage,
      content: article.content || '<p></p>',
      excerpt: article.excerpt,
      metaDescription: article.metaDescription,
      seoTitle: article.seoTitle,
      canonicalUrl: article.canonicalUrl,
      tags: article.tags,
      tagsText: article.tags.join(', '),
      author: article.author,
      publicationDate: article.publicationDate,
      status: article.status,
    });
    setEditorSessionKey(`edit-${article.id}-${Date.now()}`);
    setActiveTab('editor');
    setMobileSidebarOpen(false);
    setFeedback(null);
    setCoverFeedback(null);
  }

  function handleTitleChange(nextTitle: string) {
    setForm((prev) => ({
      ...prev,
      title: nextTitle,
      slug: slugManuallyEdited ? prev.slug : generateSlug(nextTitle),
      seoTitle: seoTitleManuallyEdited ? prev.seoTitle : autoGenerateSeoTitle(nextTitle),
    }));
  }

  function handleAutoGenerateSeoFields() {
    const generatedExcerpt = autoGenerateExcerpt(form.content);
    const generatedMeta = autoGenerateMetaDescription(
      form.excerpt || generatedExcerpt,
      form.content
    );
    const generatedSeoTitle = autoGenerateSeoTitle(form.title);
    setForm((prev) => ({
      ...prev,
      excerpt: prev.excerpt.trim() || generatedExcerpt,
      metaDescription: generatedMeta,
      seoTitle: generatedSeoTitle,
      slug: prev.slug.trim() || generateSlug(prev.title),
    }));
    notify('success', 'SEO title, excerpt, and meta description updated from article content.');
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setFeedback(null);
    setCoverFeedback(null);
    try {
      const result = await uploadArticleImageDetailed(file, 'covers');
      setForm((prev) => ({ ...prev, coverImage: result.url }));
      const msg =
        result.mode === 'firebase-storage'
          ? 'Cover image optimized and uploaded to Firebase Storage.'
          : 'Cover image compressed and attached cleanly for this article.';
      setCoverFeedback({ type: 'success', text: msg });
      notify('success', msg);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Cover image upload failed.';
      setCoverFeedback({ type: 'error', text: errMsg });
      notify('error', errMsg);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  }

  async function handleSaveArticle(targetStatus: ArticleStatus) {
    if (!user) return;
    if (!form.title.trim()) {
      notify('error', 'Article title is required before saving.');
      return;
    }

    const parsedTags = form.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 15);

    const payload: ArticleInput = {
      title: form.title,
      slug: form.slug || generateSlug(form.title),
      category: form.category,
      coverImage: form.coverImage,
      content: form.content,
      excerpt: form.excerpt || autoGenerateExcerpt(form.content),
      metaDescription:
        form.metaDescription || autoGenerateMetaDescription(form.excerpt, form.content),
      seoTitle: form.seoTitle || autoGenerateSeoTitle(form.title),
      canonicalUrl: form.canonicalUrl,
      tags: parsedTags,
      author: form.author || 'HerMoney Editorial',
      publicationDate: form.publicationDate || new Date().toISOString().slice(0, 10),
      status: targetStatus,
    };

    setSavingArticle(true);
    setFeedback(null);
    try {
      const savedId = await saveArticle(payload, user.uid, editingArticleId);
      setEditingArticleId(savedId);
      setForm((prev) => ({
        ...prev,
        ...payload,
        tagsText: parsedTags.join(', '),
      }));
      await loadDashboardData();
      if (targetStatus === 'published') {
        await publishArticleNotifications(
          {
            title: payload.title,
            slug: payload.slug,
            category: payload.category,
          },
          user.uid
        ).catch((notifErr) => {
          console.warn('Could not emit publish notification:', notifErr);
        });
      }
      notify(
        'success',
        targetStatus === 'published'
          ? 'Article published live to HerMoney Studio.'
          : 'Draft saved securely in Firestore.'
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save article.');
    } finally {
      setSavingArticle(false);
    }
  }

  async function handleQuickToggleStatus(article: Article) {
    if (!user) return;
    const nextStatus: ArticleStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      await updateArticleStatus(article.id, nextStatus);
      await loadDashboardData();
      if (nextStatus === 'published') {
        await publishArticleNotifications(
          {
            title: article.title,
            slug: article.slug,
            category: article.category,
          },
          user.uid
        ).catch((notifErr) => {
          console.warn('Could not emit publish notification:', notifErr);
        });
      }
      notify(
        'success',
        nextStatus === 'published'
          ? `"${article.title}" is now published.`
          : `"${article.title}" moved back to draft.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  async function confirmDeleteArticle() {
    if (!deleteTarget) return;
    try {
      await deleteArticle(deleteTarget.id);
      setDeleteTarget(null);
      await loadDashboardData();
      notify('success', 'Article permanently deleted.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleSaveAdSense(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (adForm.adsenseEnabled && !isValidPublisherId(adForm.publisherId)) {
      notify(
        'error',
        'Enter a valid Google AdSense Publisher ID (format: ca-pub-XXXXXXXXXXXXXXXX) before enabling ads.'
      );
      return;
    }

    setSavingAdSense(true);
    try {
      await saveAdSenseSettings(
        {
          adsenseEnabled: adForm.adsenseEnabled,
          publisherId: adForm.publisherId,
          placements: adForm.placements,
        },
        user.uid
      );
      await refreshAdSense();
      notify('success', 'Google AdSense configuration saved.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save AdSense settings.');
    } finally {
      setSavingAdSense(false);
    }
  }

  async function handleExportBackup(saveSnapshotRecord: boolean) {
    if (!user) return;
    setRunningBackup(true);
    try {
      const payload = buildBackupPayload(articles, liveAdSense);
      const sizeBytes = downloadBackupJson(payload);
      setLastLocalBackup(new Date().toISOString());

      if (saveSnapshotRecord) {
        await recordBackupSnapshot(
          backupLabel || `Backup ${new Date().toISOString().slice(0, 10)}`,
          articles,
          sizeBytes,
          user.uid
        );
        setBackupLabel('');
        await loadDashboardData();
      }
      notify('success', 'Backup JSON downloaded and snapshot recorded.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Backup failed.');
    } finally {
      setRunningBackup(false);
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setRunningBackup(true);
    try {
      const text = await file.text();
      const count = await restoreArticlesFromBackup(text, user.uid, true);
      await loadDashboardData();
      notify('success', `Restored ${count} article(s) as drafts for review.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Backup restore failed.');
    } finally {
      setRunningBackup(false);
      e.target.value = '';
    }
  }

  async function handleDeleteMessage(id: string) {
    try {
      await deleteContactMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      notify('success', 'Message removed.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not delete message.');
    }
  }

  const editorTocPreview = useMemo(() => {
    return extractTableOfContents(form.content).tocItems;
  }, [form.content]);

  const publishedArticles = useMemo(
    () => articles.filter((a) => a.status === 'published'),
    [articles]
  );

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [articles, statusFilter, searchQuery]);

  const sitemapXml = useMemo(
    () => generateSitemapXml(publishedArticles, getCanonicalBaseUrl()),
    [publishedArticles]
  );

  if (authLoading || adminCheckPending) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#FCF9F6]">
        <p className="text-sm text-[#5C5355]">Verifying administrator session...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLogin onNavigate={onNavigate} />;
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'articles', label: 'Articles', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'editor', label: editingArticleId ? 'Edit Article' : 'New Article', icon: <PenSquare className="w-4 h-4" /> },
    { id: 'adsense', label: 'Google AdSense', icon: <Settings className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO & Sitemap', icon: <Globe className="w-4 h-4" /> },
    { id: 'backups', label: 'Backups & Export', icon: <Archive className="w-4 h-4" /> },
    { id: 'inbox', label: 'Contact Inbox', icon: <Inbox className="w-4 h-4" /> },
    { id: 'setup', label: 'Firebase Setup', icon: <FileText className="w-4 h-4" /> },
  ];

  const metaLen = form.metaDescription.trim().length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FCF9F6] flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-[#1F1B1C]/40 z-30 lg:hidden"
        />
      )}

      {/* Fixed Sidebar Navigation */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-white border-r border-[#E8E0DF] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 overflow-y-auto">
          <div className="px-3 py-2 mb-4 border-b border-[#E8E0DF]">
            <BrandLogo compact />
            <p className="text-[11px] uppercase tracking-widest text-[#8E3F4F] font-medium mt-2">
              Editorial Management
            </p>
          </div>

          <button
            type="button"
            onClick={startNewArticle}
            className="w-full mb-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-xs font-medium hover:bg-[#75313F] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Article</span>
          </button>

          <nav aria-label="Dashboard navigation" className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F7EAEB] text-[#8E3F4F]'
                      : 'text-[#5C5355] hover:bg-[#FCF9F6] hover:text-[#1F1B1C]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'inbox' && messages.length > 0 && (
                    <span className="font-mono text-xs tabular-nums text-[#8E3F4F]">
                      {messages.length}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setMobileSidebarOpen(false);
                openNotificationPopup();
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium text-[#5C5355] hover:bg-[#FCF9F6] hover:text-[#1F1B1C] transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </span>
              {unreadAdminCount > 0 && (
                <span className="font-mono text-xs tabular-nums text-[#8E3F4F]">
                  {unreadAdminCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#E8E0DF] space-y-2.5 bg-[#FCF9F6]">
          <div className="px-2 text-xs text-[#5C5355] truncate" title={user.email || ''}>
            Signed in: <strong className="text-[#1F1B1C]">{user.email}</strong>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E0DF] bg-white text-xs font-medium text-[#1F1B1C] hover:bg-[#F7EAEB]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Site</span>
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E0DF] bg-white text-xs font-medium text-[#5C5355] hover:text-[#8E3F4F] cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Spacious Main Workspace */}
      <div className="flex-1 lg:pl-64 min-w-0">
        {/* Top Mobile Bar */}
        <div className="lg:hidden sticky top-16 z-20 bg-white border-b border-[#E8E0DF] px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E0DF] text-xs font-medium text-[#1F1B1C] min-h-[40px]"
          >
            <Menu className="w-4 h-4" />
            <span>Dashboard Menu</span>
          </button>
          <span className="text-xs font-medium text-[#8E3F4F] capitalize">{activeTab}</span>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
          {feedback && (
            <div
              role="status"
              className={`mb-6 px-4 py-3 rounded-lg border text-sm flex items-center justify-between gap-4 ${
                feedback.type === 'success'
                  ? 'bg-[#F4EAD5]/60 border-[#C59B43] text-[#1F1B1C]'
                  : 'bg-[#F7EAEB] border-[#E8B4B8] text-[#8E3F4F]'
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-1 hover:opacity-70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: ARTICLES LIST */}
          {activeTab === 'articles' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                    Content Workspace
                  </p>
                  <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
                    Articles &amp; Drafts
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={startNewArticle}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Article</span>
                </button>
              </div>

              {/* Clean Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-[#E8E0DF] rounded-xl">
                  <p className="text-xs text-[#5C5355] mb-1">Published Articles</p>
                  <p className="font-serif text-2xl font-semibold text-[#1F1B1C] tabular-nums">
                    {publishedArticles.length} / {INITIAL_ARTICLE_SLOT_COUNT} initial slots
                  </p>
                </div>
                <div className="p-5 bg-white border border-[#E8E0DF] rounded-xl">
                  <p className="text-xs text-[#5C5355] mb-1">Drafts in Progress</p>
                  <p className="font-serif text-2xl font-semibold text-[#1F1B1C] tabular-nums">
                    {articles.length - publishedArticles.length}
                  </p>
                </div>
                <div className="p-5 bg-white border border-[#E8E0DF] rounded-xl">
                  <p className="text-xs text-[#5C5355] mb-1">Active Categories</p>
                  <p className="font-serif text-2xl font-semibold text-[#1F1B1C] tabular-nums">
                    {CATEGORIES.length}
                  </p>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#5C5355] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by title, category, or author..."
                    className="w-full pl-10 pr-4 py-2.5 min-h-[42px] text-sm bg-white border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                  />
                </div>

                <div className="inline-flex p-1 bg-white border border-[#E8E0DF] rounded-lg">
                  {(['all', 'published', 'draft'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                        statusFilter === status
                          ? 'bg-[#F7EAEB] text-[#8E3F4F]'
                          : 'text-[#5C5355] hover:text-[#1F1B1C]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Article Table / List */}
              {loadingArticles ? (
                <div className="p-10 bg-white border border-[#E8E0DF] rounded-xl text-center text-sm text-[#5C5355]">
                  Loading articles from Firestore...
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="p-10 bg-white border border-[#E8E0DF] rounded-xl text-center">
                  <h2 className="font-serif text-xl font-semibold text-[#1F1B1C] mb-2">
                    {articles.length === 0
                      ? 'No articles created yet'
                      : 'No articles match your current filter'}
                  </h2>
                  <p className="text-sm text-[#5C5355] max-w-md mx-auto mb-6">
                    {articles.length === 0
                      ? 'Your 10 initial editorial slots are ready. Create your first article as a draft or publish it live.'
                      : 'Try clearing the search query or switching the status filter.'}
                  </p>
                  {articles.length === 0 && (
                    <button
                      type="button"
                      onClick={startNewArticle}
                      className="px-5 py-2.5 rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] cursor-pointer"
                    >
                      Create First Article
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-[#E8E0DF] rounded-xl divide-y divide-[#E8E0DF]">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FCF9F6] transition-colors"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-20 h-14 rounded-lg overflow-hidden border border-[#E8E0DF] shrink-0 bg-[#F6F0EA]">
                          <SafeImage
                            src={article.coverImage}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C5355] mb-1">
                            <span
                              className={`font-medium ${
                                article.status === 'published'
                                  ? 'text-[#166534]'
                                  : 'text-[#8E3F4F]'
                              }`}
                            >
                              {article.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{article.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{article.publicationDate}</span>
                          </div>
                          <h3 className="font-serif text-base font-semibold text-[#1F1B1C] truncate">
                            {article.title}
                          </h3>
                          <p className="text-xs text-[#5C5355] truncate mt-0.5">
                            /article/{article.slug} · By {article.author}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {article.status === 'published' && (
                          <a
                            href={`/article/${article.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              onNavigate(`/article/${article.slug}`);
                            }}
                            className="px-3 py-2 text-xs font-medium border border-[#E8E0DF] rounded-lg text-[#1F1B1C] hover:bg-white"
                          >
                            View Live
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleQuickToggleStatus(article)}
                          className="px-3 py-2 text-xs font-medium border border-[#E8E0DF] rounded-lg text-[#1F1B1C] hover:bg-white cursor-pointer"
                        >
                          {article.status === 'published' ? 'Move to Draft' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditArticle(article)}
                          className="px-3.5 py-2 text-xs font-medium bg-[#F7EAEB] text-[#8E3F4F] rounded-lg hover:bg-[#F0DCE0] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${article.title}`}
                          onClick={() => setDeleteTarget(article)}
                          className="p-2 text-[#5C5355] hover:text-[#9E2A3B] rounded-lg hover:bg-[#F7EAEB] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARTICLE EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8E0DF]">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                    Manual Editorial Publishing
                  </p>
                  <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
                    {editingArticleId ? 'Edit Article' : 'Compose New Article'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={savingArticle}
                    onClick={() => void handleSaveArticle('draft')}
                    className="px-4 py-2.5 min-h-[44px] rounded-lg border border-[#E8E0DF] bg-white text-sm font-medium text-[#1F1B1C] hover:bg-[#F6F0EA] disabled:opacity-60 cursor-pointer"
                  >
                    {savingArticle ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={savingArticle}
                    onClick={() => void handleSaveArticle('published')}
                    className="px-5 py-2.5 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] disabled:opacity-60 cursor-pointer"
                  >
                    {savingArticle ? 'Saving...' : 'Publish Article'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Composition Column */}
                <div className="xl:col-span-8 space-y-6">
                  <div className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-5">
                    <div>
                      <label htmlFor="art-title" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        1. Article Title *
                      </label>
                      <input
                        id="art-title"
                        type="text"
                        maxLength={200}
                        value={form.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Enter compelling magazine headline..."
                        className="w-full px-4 py-3 text-base font-serif bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="art-slug" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                          2. URL Slug *
                        </label>
                        <input
                          id="art-slug"
                          type="text"
                          maxLength={180}
                          value={form.slug}
                          onChange={(e) => {
                            setSlugManuallyEdited(true);
                            setForm((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
                          }}
                          placeholder="seo-friendly-article-slug"
                          className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                        />
                      </div>

                      <div>
                        <label htmlFor="art-category" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                          3. Category *
                        </label>
                        <select
                          id="art-category"
                          value={form.category}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              category: e.target.value as CategoryName,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                        >
                          {CATEGORY_NAMES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 5. Microsoft Word-Style Rich Text Editor */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1F1B1C] mb-2">
                      5. Article Content (Rich Text Editor)
                    </label>
                    <RichTextEditor
                      editorKey={editorSessionKey}
                      value={form.content}
                      onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
                    />
                  </div>

                  {/* 6 & 7. Excerpt & SEO Metadata */}
                  <div className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-serif text-lg font-semibold text-[#1F1B1C]">
                        Excerpt &amp; Automatic SEO Metadata
                      </h2>
                      <button
                        type="button"
                        onClick={handleAutoGenerateSeoFields}
                        className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#C59B43]/50 bg-[#FCF9F6] text-[#1F1B1C] hover:bg-[#F4EAD5] cursor-pointer"
                      >
                        Auto-Generate from Content
                      </button>
                    </div>

                    <div>
                      <label htmlFor="art-excerpt" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        6. Excerpt
                      </label>
                      <textarea
                        id="art-excerpt"
                        rows={2}
                        maxLength={500}
                        value={form.excerpt}
                        onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                        placeholder="Short editorial summary displayed on homepage and category cards..."
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div>
                      <label htmlFor="art-seo-title" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        SEO Title Tag
                      </label>
                      <input
                        id="art-seo-title"
                        type="text"
                        maxLength={160}
                        value={form.seoTitle}
                        onChange={(e) => {
                          setSeoTitleManuallyEdited(true);
                          setForm((prev) => ({ ...prev, seoTitle: e.target.value }));
                        }}
                        placeholder="Article Title | HerMoney Studio"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="art-meta" className="text-xs font-semibold text-[#1F1B1C]">
                          7. Meta Description
                        </label>
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            metaLen > 160 ? 'text-[#9E2A3B]' : 'text-[#5C5355]'
                          }`}
                        >
                          {metaLen} / 160 recommended
                        </span>
                      </div>
                      <textarea
                        id="art-meta"
                        rows={3}
                        maxLength={320}
                        value={form.metaDescription}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, metaDescription: e.target.value }))
                        }
                        placeholder="Concise summary for Google Search snippets and Open Graph social cards..."
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div>
                      <label htmlFor="art-canonical" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        Canonical URL (optional override)
                      </label>
                      <input
                        id="art-canonical"
                        type="url"
                        maxLength={500}
                        value={form.canonicalUrl}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, canonicalUrl: e.target.value }))
                        }
                        placeholder={`${getCanonicalBaseUrl()}/article/${form.slug || 'your-slug'}`}
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Metadata & Cover Column */}
                <div className="xl:col-span-4 space-y-6">
                  {/* 4. Cover Image Management */}
                  <div className="bg-white border border-[#E8E0DF] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-serif text-base font-semibold text-[#1F1B1C]">
                        4. Cover Image
                      </h2>
                      {form.coverImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, coverImage: '' }));
                            setCoverFeedback(null);
                          }}
                          className="text-xs font-medium text-[#8E3F4F] hover:underline cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-[#E8E0DF] bg-[#FCF9F6]">
                      <SafeImage
                        src={form.coverImage}
                        alt={form.title || 'Cover preview'}
                        fallbackTitle="Cover image preview"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <label
                      aria-busy={uploadingCover}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg border border-[#C59B43]/60 bg-[#FCF9F6] text-xs font-medium text-[#1F1B1C] transition-colors ${
                        uploadingCover ? 'opacity-65 cursor-wait' : 'hover:bg-[#F7EAEB] cursor-pointer'
                      }`}
                    >
                      <Upload className="w-4 h-4 text-[#8E3F4F]" />
                      <span>
                        {uploadingCover ? 'Uploading Image...' : 'Upload from Device / Computer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingCover}
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>

                    {coverFeedback && (
                      <p
                        role="status"
                        className={`text-xs px-3 py-2 rounded-lg border ${
                          coverFeedback.type === 'success'
                            ? 'bg-[#F4EAD5]/50 border-[#C59B43] text-[#1F1B1C]'
                            : 'bg-[#F7EAEB] border-[#E8B4B8] text-[#8E3F4F]'
                        }`}
                      >
                        {coverFeedback.text}
                      </p>
                    )}

                    <div>
                      <label htmlFor="art-cover-url" className="block text-xs font-medium text-[#5C5355] mb-1">
                        Or External Image URL
                      </label>
                      {form.coverImage.startsWith('data:image/') && (
                        <p className="text-[11px] text-[#5C5355] mb-1.5">
                          Compressed device image is attached. Paste an https:// URL below to replace it.
                        </p>
                      )}
                      <input
                        id="art-cover-url"
                        type="url"
                        maxLength={2048}
                        value={form.coverImage.startsWith('data:image/') ? '' : form.coverImage}
                        onChange={(e) => {
                          setCoverFeedback(null);
                          setForm((prev) => ({ ...prev, coverImage: e.target.value }));
                        }}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-xs bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>
                  </div>

                  {/* 8, 9, 10. Tags, Author, Publication Date */}
                  <div className="bg-white border border-[#E8E0DF] rounded-xl p-5 space-y-4">
                    <h2 className="font-serif text-base font-semibold text-[#1F1B1C]">
                      Publication Details
                    </h2>

                    <div>
                      <label htmlFor="art-tags" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        8. Tags (comma-separated, max 15)
                      </label>
                      <input
                        id="art-tags"
                        type="text"
                        value={form.tagsText}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, tagsText: e.target.value }))
                        }
                        placeholder="remote work, side hustle, budgeting"
                        className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div>
                      <label htmlFor="art-author" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        9. Author *
                      </label>
                      <input
                        id="art-author"
                        type="text"
                        maxLength={120}
                        value={form.author}
                        onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div>
                      <label htmlFor="art-date" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                        10. Publication Date *
                      </label>
                      <input
                        id="art-date"
                        type="date"
                        value={form.publicationDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, publicationDate: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                      />
                    </div>

                    <div className="pt-2 border-t border-[#E8E0DF] text-xs text-[#5C5355]">
                      Current Status:{' '}
                      <strong className="text-[#8E3F4F] uppercase">{form.status}</strong>
                    </div>
                  </div>

                  {/* Live Table of Contents Preview */}
                  <div className="bg-white border border-[#E8E0DF] rounded-xl p-5">
                    <h2 className="font-serif text-base font-semibold text-[#1F1B1C] mb-2">
                      Table of Contents Preview
                    </h2>
                    {editorTocPreview.length === 0 ? (
                      <p className="text-xs text-[#5C5355] leading-relaxed">
                        Add Heading 2 or Heading 3 blocks in the editor to generate a clickable Table
                        of Contents automatically.
                      </p>
                    ) : (
                      <ol className="space-y-1.5 text-xs text-[#1F1B1C]">
                        {editorTocPreview.map((item) => (
                          <li key={item.id} className={item.level === 3 ? 'pl-4 text-[#5C5355]' : ''}>
                            {item.text}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE ADSENSE */}
          {activeTab === 'adsense' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  Monetization Configuration
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
                  Google AdSense Placements
                </h1>
                <p className="text-sm text-[#5C5355] mt-2 max-w-2xl">
                  Configure your verified Google AdSense Publisher ID and individual placement slots.
                  No advertisements or placeholders appear on the public site until AdSense is
                  enabled with valid credentials and the visitor grants advertising consent.
                </p>
              </div>

              <form
                onSubmit={handleSaveAdSense}
                className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8E0DF]">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#1F1B1C]">
                      Enable Google AdSense Integration
                    </h2>
                    <p className="text-xs text-[#5C5355] mt-0.5">
                      Master control for all AdSense placements across HerMoney Studio.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adForm.adsenseEnabled}
                      onChange={(e) =>
                        setAdForm((prev) => ({ ...prev, adsenseEnabled: e.target.checked }))
                      }
                      className="h-5 w-5 accent-[#8E3F4F] rounded"
                    />
                    <span className="text-sm font-medium text-[#1F1B1C]">
                      {adForm.adsenseEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                <div>
                  <label htmlFor="ads-pub-id" className="block text-xs font-semibold text-[#1F1B1C] mb-1.5">
                    Google AdSense Publisher ID
                  </label>
                  <input
                    id="ads-pub-id"
                    type="text"
                    maxLength={64}
                    value={adForm.publisherId}
                    onChange={(e) =>
                      setAdForm((prev) => ({ ...prev, publisherId: e.target.value }))
                    }
                    placeholder="ca-pub-0000000000000000"
                    className="w-full max-w-md px-3.5 py-2.5 text-sm font-mono bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg focus:outline-none focus:border-[#8E3F4F]"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-xs uppercase tracking-widest text-[#8E3F4F] font-semibold">
                    Configurable Advertisement Positions
                  </h3>
                  {PLACEMENT_META.map((item) => {
                    const slot = adForm.placements[item.key];
                    return (
                      <div
                        key={item.key}
                        className="p-4 rounded-lg bg-[#FCF9F6] border border-[#E8E0DF] grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                      >
                        <div className="md:col-span-5">
                          <label className="inline-flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slot.enabled}
                              onChange={(e) =>
                                setAdForm((prev) => ({
                                  ...prev,
                                  placements: {
                                    ...prev.placements,
                                    [item.key]: { ...slot, enabled: e.target.checked },
                                  },
                                }))
                              }
                              className="h-4 w-4 accent-[#8E3F4F]"
                            />
                            <span className="text-sm font-semibold text-[#1F1B1C]">
                              {item.label}
                            </span>
                          </label>
                          <p className="text-xs text-[#5C5355] mt-1 pl-6">{item.description}</p>
                        </div>

                        <div className="md:col-span-4">
                          <label className="block text-[11px] font-medium text-[#5C5355] mb-1">
                            Ad Slot ID
                          </label>
                          <input
                            type="text"
                            maxLength={64}
                            value={slot.slotId}
                            onChange={(e) =>
                              setAdForm((prev) => ({
                                ...prev,
                                placements: {
                                  ...prev.placements,
                                  [item.key]: { ...slot, slotId: e.target.value },
                                },
                              }))
                            }
                            placeholder="1234567890"
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E8E0DF] rounded-lg"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-medium text-[#5C5355] mb-1">
                            Format
                          </label>
                          <select
                            value={slot.format}
                            onChange={(e) =>
                              setAdForm((prev) => ({
                                ...prev,
                                placements: {
                                  ...prev.placements,
                                  [item.key]: {
                                    ...slot,
                                    format: e.target.value as 'auto' | 'horizontal' | 'rectangle',
                                  },
                                },
                              }))
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-[#E8E0DF] rounded-lg"
                          >
                            <option value="auto">Responsive Auto</option>
                            <option value="horizontal">Horizontal Banner</option>
                            <option value="rectangle">In-Article Rectangle</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-lg bg-[#F4EAD5]/50 border border-[#C59B43]/40 text-xs text-[#5C5355] leading-relaxed">
                  <strong className="text-[#1F1B1C]">AdSense Policy Notice:</strong> Having an
                  AdSense-ready architecture, Privacy Policy, and GDPR consent controls does not
                  guarantee Google AdSense approval. Final approval depends on Google&apos;s site
                  review, original editorial content quality, and policy compliance.
                </div>

                <button
                  type="submit"
                  disabled={savingAdSense}
                  className="px-6 py-2.5 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-sm font-medium hover:bg-[#75313F] disabled:opacity-60 cursor-pointer"
                >
                  {savingAdSense ? 'Saving Configuration...' : 'Save AdSense Settings'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: SEO & SITEMAP */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  Search Engine Optimization
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
                  XML Sitemap, Robots.txt &amp; SEO Audit
                </h1>
              </div>

              <div className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#1F1B1C]">
                      Dynamic XML Sitemap
                    </h2>
                    <p className="text-xs text-[#5C5355]">
                      Automatically includes the homepage, 6 category URLs, 6 info pages, and{' '}
                      <span className="tabular-nums">{publishedArticles.length}</span> published
                      article(s).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(sitemapXml);
                        notify('success', 'XML Sitemap copied to clipboard.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#E8E0DF] rounded-lg hover:bg-[#FCF9F6] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy XML</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([sitemapXml], { type: 'application/xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'sitemap.xml';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#8E3F4F] text-white rounded-lg hover:bg-[#75313F] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download sitemap.xml</span>
                    </button>
                  </div>
                </div>
                <pre className="p-4 bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg text-xs font-mono text-[#1F1B1C] overflow-x-auto max-h-72">
                  {sitemapXml}
                </pre>
              </div>

              <div className="bg-white border border-[#E8E0DF] rounded-xl p-6">
                <h2 className="font-serif text-lg font-semibold text-[#1F1B1C] mb-3">
                  Article SEO Health Audit
                </h2>
                {publishedArticles.length === 0 ? (
                  <p className="text-sm text-[#5C5355]">
                    Publish articles to inspect per-article SEO title, meta description, and Schema
                    JSON-LD status.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E8E0DF] text-[#5C5355]">
                          <th className="py-2.5 pr-4 font-medium">Article</th>
                          <th className="py-2.5 pr-4 font-medium">SEO Title</th>
                          <th className="py-2.5 pr-4 font-medium">Meta Length</th>
                          <th className="py-2.5 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E0DF]">
                        {publishedArticles.map((art) => (
                          <tr key={art.id}>
                            <td className="py-3 pr-4 font-medium text-[#1F1B1C]">{art.title}</td>
                            <td className="py-3 pr-4 text-[#5C5355] truncate max-w-[220px]">
                              {art.seoTitle || 'Auto'}
                            </td>
                            <td className="py-3 pr-4 font-mono tabular-nums text-[#5C5355]">
                              {art.metaDescription.length} chars
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => startEditArticle(art)}
                                className="text-[#8E3F4F] hover:underline cursor-pointer"
                              >
                                Edit SEO
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BACKUPS & EXPORT */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  Data Resilience
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
                  Website &amp; Article Backups
                </h1>
                <p className="text-sm text-[#5C5355] mt-2 max-w-2xl">
                  Export complete JSON backups of all published articles, drafts, and AdSense
                  settings on the Firebase Spark free tier, or restore articles from a previous
                  backup file.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-4">
                  <h2 className="font-serif text-lg font-semibold text-[#1F1B1C]">
                    Create &amp; Download Backup
                  </h2>
                  <p className="text-xs text-[#5C5355]">
                    Last local export:{' '}
                    <span className="font-mono">
                      {lastLocalBackup
                        ? new Date(lastLocalBackup).toLocaleString()
                        : 'No export recorded yet'}
                    </span>
                  </p>
                  <input
                    type="text"
                    maxLength={160}
                    value={backupLabel}
                    onChange={(e) => setBackupLabel(e.target.value)}
                    placeholder="Optional label (e.g. Weekly Editorial Snapshot)"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FCF9F6] border border-[#E8E0DF] rounded-lg"
                  />
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={runningBackup}
                      onClick={() => void handleExportBackup(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#8E3F4F] text-white text-xs font-medium hover:bg-[#75313F] disabled:opacity-60 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JSON &amp; Log Snapshot</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-4">
                  <h2 className="font-serif text-lg font-semibold text-[#1F1B1C]">
                    Restore from JSON Backup
                  </h2>
                  <p className="text-xs text-[#5C5355] leading-relaxed">
                    Restored articles are imported safely as <strong>drafts</strong> so you can
                    verify formatting and slugs before publishing live.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg border border-[#E8E0DF] bg-[#FCF9F6] text-xs font-medium text-[#1F1B1C] hover:bg-[#F7EAEB] cursor-pointer">
                    <Upload className="w-4 h-4 text-[#8E3F4F]" />
                    <span>Choose Backup JSON File</span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      disabled={runningBackup}
                      onChange={handleRestoreFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#F4EAD5]/50 border border-[#C59B43]/40 text-xs text-[#5C5355] leading-relaxed space-y-1.5">
                <p className="font-semibold text-[#1F1B1C]">
                  Firebase Free Tier vs. Paid Plan Backup Note
                </p>
                <p>
                  JSON export/import and Firestore snapshot logs run 100% within the Firebase Spark
                  free tier. Native Google Cloud scheduled Firestore exports (
                  <span className="font-mono">gcloud firestore export</span> to Cloud Storage
                  buckets) and Point-in-Time Recovery (PITR) require upgrading to the pay-as-you-go
                  Firebase Blaze plan.
                </p>
              </div>

              <div className="bg-white border border-[#E8E0DF] rounded-xl p-6">
                <h2 className="font-serif text-lg font-semibold text-[#1F1B1C] mb-4">
                  Recorded Snapshot Log
                </h2>
                {backupHistory.length === 0 ? (
                  <p className="text-sm text-[#5C5355]">No backup snapshots logged yet.</p>
                ) : (
                  <div className="divide-y divide-[#E8E0DF]">
                    {backupHistory.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-[#1F1B1C]">{item.label}</p>
                          <p className="text-[#5C5355] font-mono tabular-nums mt-0.5">
                            {item.articleCount} articles ({item.publishedCount} published,{' '}
                            {item.draftCount} drafts) · {(item.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteBackupRecord(item.id).then(() => loadDashboardData())
                          }
                          className="p-2 text-[#5C5355] hover:text-[#9E2A3B] cursor-pointer"
                          aria-label="Delete snapshot record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CONTACT INBOX */}
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  Reader Inquiries
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">Contact Inbox</h1>
              </div>

              {loadingMessages ? (
                <p className="text-sm text-[#5C5355]">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="p-10 bg-white border border-[#E8E0DF] rounded-xl text-center text-sm text-[#5C5355]">
                  No contact submissions received yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-6 bg-white border border-[#E8E0DF] rounded-xl space-y-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-serif text-lg font-semibold text-[#1F1B1C]">
                            {msg.subject}
                          </h2>
                          <p className="text-xs text-[#5C5355]">
                            From <strong className="text-[#1F1B1C]">{msg.name}</strong> ({msg.email}
                            ) · GDPR consent confirmed
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteMessage(msg.id)}
                          className="p-2 text-[#5C5355] hover:text-[#9E2A3B] cursor-pointer"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-[#2A2425] leading-relaxed pt-2 border-t border-[#E8E0DF] whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: FIREBASE SETUP & DEPLOYMENT */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E3F4F] font-medium mb-1">
                  Infrastructure &amp; Deployment
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[#1F1B1C]">
                  Firebase Setup &amp; Hosting Guide
                </h1>
              </div>

              <div className="bg-white border border-[#E8E0DF] rounded-xl p-6 space-y-4 text-sm text-[#2A2425] leading-relaxed">
                <div className="flex items-center gap-2 text-[#166534] font-medium text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Provisioned Project: <span className="font-mono">trusty-aleph-640px</span> ·
                    Firestore rules deployed.
                  </span>
                </div>

                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong>Firebase Project:</strong> Connected via{' '}
                    <span className="font-mono">firebase-applet-config.json</span> and{' '}
                    <span className="font-mono">.firebaserc</span> (Spark Free Tier).
                  </li>
                  <li>
                    <strong>Enable Email/Password Authentication:</strong> Open Firebase Console →
                    Authentication → Sign-in method → Enable <strong>Email/Password</strong>, then
                    create your administrator user under Users and verify the email address.
                  </li>
                  <li>
                    <strong>Configure Administrator Email:</strong> Update the bootstrap admin email
                    in <span className="font-mono">firestore.rules</span> &amp;{' '}
                    <span className="font-mono">src/context/AuthContext.tsx</span>, or add the
                    administrator&apos;s UID document at{' '}
                    <span className="font-mono">admins/&lt;uid&gt;</span> in Firestore Console.
                  </li>
                  <li>
                    <strong>Cloud Firestore:</strong> Configured with database ID{' '}
                    <span className="font-mono">ai-studio-66c0a6d8-d6e6-46bb-a7f7-9f5d4c0a99d7</span>.
                  </li>
                  <li>
                    <strong>Firebase Storage (Image Uploads):</strong> In Firebase Console → Storage,
                    click Get Started (Spark free tier includes 5 GB storage / 1 GB daily download),
                    then deploy <span className="font-mono">storage.rules</span>.
                  </li>
                  <li>
                    <strong>Deploy Rules:</strong> Run{' '}
                    <span className="font-mono">firebase deploy --only firestore:rules,storage</span>.
                  </li>
                  <li>
                    <strong>Build &amp; Deploy to Firebase Hosting:</strong> Run{' '}
                    <span className="font-mono">npm run build</span> then{' '}
                    <span className="font-mono">firebase deploy --only hosting</span> to publish on
                    your free <span className="font-mono">.web.app</span> URL.
                  </li>
                  <li>
                    <strong>Custom Domain:</strong> In Firebase Console → Hosting → Add custom
                    domain, verify DNS TXT/A records (free SSL certificate included on Spark plan).
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#1F1B1C]/40 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E8E0DF] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="font-serif text-xl font-semibold text-[#1F1B1C] mb-2">
              Delete Article?
            </h2>
            <p className="text-sm text-[#5C5355] leading-relaxed mb-6">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[#1F1B1C]">&ldquo;{deleteTarget.title}&rdquo;</strong>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium border border-[#E8E0DF] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteArticle()}
                className="px-4 py-2 text-xs font-medium bg-[#9E2A3B] text-white rounded-lg hover:bg-[#7F1F2E] cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
