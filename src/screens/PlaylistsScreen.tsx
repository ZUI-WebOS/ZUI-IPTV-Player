// PlaylistsScreen — Çalma Listeleri yönetim ekranı (Faz 6B)
// Kaynakları Hero + Secondary kart hiyerarşisiyle listeler.
// sources.length === 0 → Onboarding akışına yönlendir.

import { useState, useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useSourceStore } from '@/state/sourceStore';
import { useUIStore } from '@/state/uiStore';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { usePlaylistStore } from '@/state/playlistStore';
import { useMoviesStore } from '@/state/moviesStore';
import { useSeriesStore } from '@/state/seriesStore';
import { useSettingsStore, LANGUAGE_LOCALES } from '@/state/settingsStore';
import type { Source } from '@/types/source';

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function formatTimeAgo(ts: number, locale: string): string {
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const sec = Math.round(diff / 1000);
  if (sec < 60) return rtf.format(-sec, 'second');
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, 'minute');
  const h = Math.round(min / 60);
  if (h < 24) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}

function sourceUrl(source: Source): string {
  if (source.type === 'm3u') {
    const cfg = source.config as { url: string };
    return cfg.url;
  }
  const cfg = source.config as { host: string; port: number };
  return `${cfg.host}:${cfg.port}`;
}

// ─── Action Button (kart içi) ─────────────────────────────────────────────────

function ActionButton({
  focusKey: fk,
  onPress,
  disabled,
  loading,
  danger,
  accent,
  children,
}: {
  focusKey: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  /** accent=true → persistent amber glow (used for "Seçili" state) */
  accent?: boolean;
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({
    focusKey: fk,
    onEnterPress: disabled || loading ? undefined : onPress,
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium border transition-all',
        disabled || loading
          ? 'border-white/[0.06] text-white/20 cursor-not-allowed'
          : danger
            ? focused
              ? 'border-red-500/50 bg-red-500/15 text-red-400 shadow-[0_0_16px_-4px_rgba(239,68,68,0.4)] scale-[1.03]'
              : 'border-red-500/20 text-red-400/70 hover:border-red-500/40'
            : accent
              ? focused
                ? 'border-[#E8B567]/60 bg-[#E8B567]/[0.12] text-[#E8B567] shadow-[0_0_20px_-4px_#E8B567] scale-[1.03]'
                : 'border-[#E8B567]/30 bg-[#E8B567]/[0.06] text-[#E8B567]/80'
              : focused
                ? 'border-[#E8B567]/45 bg-[#E8B567]/[0.08] text-[#E8B567] shadow-[0_0_16px_-4px_#E8B567] scale-[1.03]'
                : 'border-white/[0.08] text-white/55 hover:text-white/75',
      ].join(' ')}
    >
      {loading ? (
        <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

// ─── Source Card ──────────────────────────────────────────────────────────────

function SourceCard({
  source,
  isHero,
  isSyncing,
  onSync,
  onDelete,
  onToggleEnabled,
}: {
  source: Source;
  isHero: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore(s => s.language);
  const locale = LANGUAGE_LOCALES[language] ?? 'en-US';
  const typeLabel = source.type === 'm3u' ? 'M3U' : 'XTREAM';
  const syncedLabel = source.syncedAt ? formatTimeAgo(source.syncedAt, locale) : '—';
  const url = sourceUrl(source);

  return (
    <div
      className={[
        'flex flex-col rounded-2xl border transition-all',
        isHero ? 'px-8 py-7' : 'px-6 py-5',
        source.enabled
          ? isHero
            ? 'border-white/10 bg-white/[0.035]'
            : 'border-white/[0.07] bg-white/[0.018]'
          : 'border-white/[0.04] bg-white/[0.01] opacity-60',
      ].join(' ')}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-6">
        {/* Left: name + badges + url */}
        <div className="flex flex-col gap-2 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded border border-white/15 text-white/45 font-semibold">
              {typeLabel}
            </span>
          </div>

          {/* Name */}
          <h3 className={[
            'font-semibold truncate',
            isHero ? 'text-[20px] text-white' : 'text-[16px] text-white/90',
          ].join(' ')}>
            {source.name}
          </h3>

          {/* URL */}
          {isHero && (
            <p className="text-[11px] text-white/25 font-mono truncate max-w-[480px]">{url}</p>
          )}
        </div>

        {/* Right: channel count */}
        <div className="flex flex-col items-end shrink-0">
          <span className={['font-light tabular-nums text-white/65', isHero ? 'text-[32px]' : 'text-[24px]'].join(' ')}>
            {source.channelCount.toLocaleString(locale)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/25">{t('playlists.channel_count')}</span>
        </div>
      </div>

      {/* Synced at */}
      <div className="mt-3 text-[11px] text-white/20">
        {t('playlists.last_updated')} <span className="text-white/35">{syncedLabel}</span>
        {source.lastError && (
          <span className="ml-3 text-red-400/70">{t('playlists.error_prefix')} {source.lastError.slice(0, 60)}…</span>
        )}
      </div>

      {/* Divider */}
      <div className="mt-5 mb-4 h-px bg-white/[0.05]" />

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Aktif / Pasif toggle */}
        <ActionButton
          focusKey={`PL_TOG_${source.id}`}
          onPress={onToggleEnabled}
          disabled={isSyncing}
          accent={source.enabled}
          danger={!source.enabled}
        >
          {source.enabled ? (
            <>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t('playlists.active')}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {t('playlists.passive')}
            </>
          )}
        </ActionButton>

        <ActionButton
          focusKey={`PL_SYNC_${source.id}`}
          onPress={onSync}
          loading={isSyncing}
          disabled={isSyncing}
        >
          {!isSyncing && (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          )}
          {isSyncing ? t('playlists.refreshing') : t('playlists.refresh')}
        </ActionButton>

        <ActionButton
          focusKey={`PL_DEL_${source.id}`}
          onPress={onDelete}
          danger
          disabled={isSyncing}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          {t('playlists.delete')}
        </ActionButton>
      </div>
    </div>
  );
}

// ─── Add Button (Header) ──────────────────────────────────────────────────────

function AddButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { ref, focused } = useFocusable({ focusKey: 'PL_ADD_BTN', onEnterPress: onPress });
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        'inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all',
        focused
          ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.10] text-[#E8B567] shadow-[0_0_28px_-8px_#E8B567] scale-[1.04]'
          : 'border-white/12 text-white/65 hover:text-white/80',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {t('playlists.add')}
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const { ref, focused } = useFocusable({ focusKey: 'PL_EMPTY_ADD', onEnterPress: onAdd });
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6">
      <div className="grid place-items-center w-20 h-20 rounded-2xl border border-white/[0.06] bg-white/[0.025]">
        <svg viewBox="0 0 24 24" className="w-9 h-9 text-white/20" fill="none" stroke="currentColor"
          strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[16px] text-white/55">{t('playlists.empty_title')}</p>
        <p className="text-[13px] text-white/30">{t('playlists.empty_subtitle')}</p>
      </div>
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onClick={onAdd}
        className={[
          'inline-flex items-center gap-3 px-7 py-3.5 rounded-xl text-[14px] font-semibold border transition-all',
          focused
            ? 'border-[#E8B567]/55 bg-[#E8B567]/[0.10] text-[#E8B567] shadow-[0_0_28px_-8px_#E8B567] scale-[1.04]'
            : 'border-white/15 text-white/70',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('playlists.add_first')}
      </button>
    </div>
  );
}

// ─── Main: PlaylistsScreen ────────────────────────────────────────────────────

export function PlaylistsScreen() {
  const { t } = useTranslation();
  const language = useSettingsStore(s => s.language);
  const locale = LANGUAGE_LOCALES[language] ?? 'en-US';
  const navigate   = useUIStore((s) => s.navigate);
  const sources        = useSourceStore((s) => s.sources);
  const syncSource     = useSourceStore((s) => s.syncSource);
  const removeSource   = useSourceStore((s) => s.removeSource);
  const toggleSource   = useSourceStore((s) => s.toggleSource);
  const showToast      = useToast((s) => s.show);

  const setActiveSourceFilter = usePlaylistStore((s) => s.setActiveSourceFilter);

  // Ekrana girildiğinde filtreyi sıfırla — Aktif/Pasif toggle ile yönetildiği için
  // belirli kaynak filtresi artık bu ekranda kullanılmıyor.
  useEffect(() => {
    setActiveSourceFilter('all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [syncingId, setSyncingId]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);

  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'PLAYLISTS',
    isFocusBoundary: true,
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  // sources yoksa Onboarding'e yönlendir
  useEffect(() => {
    if (sources.length === 0) {
      navigate('onboarding');
    }
  }, [sources.length, navigate]);

  // İlk odak
  useEffect(() => {
    if (sources.length > 0) {
      const id = setTimeout(() => setFocus('PL_ADD_BTN'), 80);
      return () => clearTimeout(id);
    }
  }, [sources.length, setFocus]);

  const handleSync = async (id: string) => {
    if (syncingId) return;
    setSyncingId(id);
    const result = await syncSource(id);
    setSyncingId(null);
    if (result.ok) {
      showToast(t('playlists.updated', { count: result.channelCount.toLocaleString(locale) }));
    } else {
      showToast(t('playlists.update_failed', { error: result.error }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    await removeSource(deleteTarget.id);
    setDeleteTarget(null);
    showToast(t('playlists.deleted', { name }));
    // sources boşaldıysa useEffect → onboarding'e yönlendirir
  };

  const handleToggleEnabled = async (source: Source) => {
    const becomingEnabled = !source.enabled;
    await toggleSource(source.id, becomingEnabled);
    // Xtream kaynağı aktif edilince Movies / Series hata durumunu sıfırla;
    // böylece o ekranlara gidildiğinde otomatik yeniden yükleme tetiklenir.
    if (becomingEnabled && source.type === 'xtream') {
      if (useMoviesStore.getState().status === 'error') {
        useMoviesStore.setState({ status: 'idle' });
      }
      if (useSeriesStore.getState().status === 'error') {
        useSeriesStore.setState({ status: 'idle' });
      }
    }
    showToast(t(source.enabled ? 'playlists.deactivated' : 'playlists.activated', { name: source.name }));
  };

  // İstatistikler
  const activeCount = sources.filter((s) => s.enabled).length;

  if (sources.length === 0) return null; // useEffect navigate çalışana kadar flash engelle

  return (
    <>
      <FocusContext.Provider value={focusKey}>
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="flex flex-col h-full"
        >
          {/* ── Header ── */}
          <div className="px-12 pt-8 pb-6 shrink-0">
            {/* Breadcrumb / konu */}
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-semibold mb-1">
              KAYNAKLAR · V{(import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.1'}
            </p>

            {/* Title row */}
            <div className="flex items-center justify-between gap-6">
              <h1 className="font-serif text-[36px] font-light text-white leading-none">
                {t('playlists.title')}
              </h1>
              <AddButton onPress={() => navigate('onboarding')} />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 mt-4 text-[11px] text-white/35 uppercase tracking-[0.25em] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_6px_#E8B567]" />
              <span>{t('playlists.list_count', { count: sources.length })}</span>
              <span className="text-white/15 mx-1">·</span>
              <span className="text-emerald-400/70">{t('playlists.active_count', { count: activeCount })}</span>
              {activeCount < sources.length && (
                <>
                  <span className="text-white/15 mx-1">·</span>
                  <span className="text-red-400/50">{t('playlists.passive_count', { count: sources.length - activeCount })}</span>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="mt-6 h-px bg-white/[0.06]" />
          </div>

          {/* ── Source Cards ── */}
          <div className="flex-1 overflow-y-auto px-12 pb-12">
            {sources.length === 0 ? (
              <EmptyState onAdd={() => navigate('onboarding')} />
            ) : (
              <div className="flex flex-col gap-4 pt-2">
                {sources.map((source, idx) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    isHero={idx === 0}
                    isSyncing={syncingId === source.id}
                    onSync={() => void handleSync(source.id)}
                    onDelete={() => setDeleteTarget(source)}
                    onToggleEnabled={() => void handleToggleEnabled(source)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </FocusContext.Provider>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          title={t('playlists.confirm_delete_title')}
          message={t('playlists.confirm_delete_msg', { name: deleteTarget.name })}
          confirmLabel={t('playlists.confirm_yes')}
          cancelLabel={t('playlists.confirm_cancel')}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
