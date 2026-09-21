import { useEffect, useState, useCallback } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/state/uiStore';
import { usePlaylistStore } from '@/state/playlistStore';
import { useParentalStore } from '@/state/parentalStore';
import { useToast } from '@/components/ui/Toast';
import { PinSetupModal } from '@/components/parental/PinSetupModal';
import { useMoviesStore } from '@/state/moviesStore';
import { useSeriesStore } from '@/state/seriesStore';
import { useSettingsStore, LANGUAGE_NAMES, type Language, type SubtitleSize } from '@/state/settingsStore';

// ─── SVG Icons (28×28) ────────────────────────────────────────────────────────

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);


const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);

const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);


const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconSubtitle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h4M13 15h4M7 11h10" />
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// ─── Badge pill ───────────────────────────────────────────────────────────────

function Badge({ label, variant }: { label: string; variant: 'on' | 'off' }) {
  const isOn = variant === 'on';
  return (
    <span className={[
      'shrink-0 flex items-center gap-2 px-2.5 py-1 rounded-full',
      'text-[10px] uppercase tracking-[0.25em] font-semibold',
      isOn
        ? 'border border-[#E8B567]/40 bg-[#E8B567]/10 text-[#E8B567]'
        : 'border border-white/[0.08] text-white/45',
    ].join(' ')}>
      <span className={[
        'w-1.5 h-1.5 rounded-full',
        isOn
          ? 'bg-[#E8B567] shadow-[0_0_8px_#E8B567]'
          : 'bg-white/20',
      ].join(' ')} />
      {label}
    </span>
  );
}

// ─── Settings Card ────────────────────────────────────────────────────────────

type CardProps = {
  focusKey: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant: 'on' | 'off' };
  onEnterPress: () => void;
};

function SettingsCard({ focusKey: cardFocusKey, icon, title, subtitle, badge, onEnterPress }: CardProps) {
  const { ref, focused } = useFocusable({ focusKey: cardFocusKey, onEnterPress });

  const isOn = badge?.variant === 'on';

  // Card background + border: ONLY focused gets amber ring — on/off cards use neutral border
  const cardCls = focused
    ? 'bg-[#E8B567]/[0.08] border-[#E8B567]/55 scale-[1.02] shadow-[0_0_0_1px_rgba(232,181,103,0.3),0_30px_60px_-30px_rgba(232,181,103,0.5)]'
    : isOn
    ? 'bg-white/[0.035] border-white/[0.12]'
    : 'bg-white/[0.025] border-white/[0.06]';

  // Icon circle: amber for focused or on (amber icon = clear "on" indicator, no border confusion)
  const iconCls = focused
    ? 'bg-[#E8B567]/15 border-[#E8B567]/40 text-[#E8B567]'
    : isOn
    ? 'bg-[#E8B567]/[0.12] border-[#E8B567]/25 text-[#E8B567]'
    : 'bg-white/[0.04] border-white/[0.06] text-white/75';

  // Subtitle: amber only when focused; on cards get white/70 so they're readable but not "focused-looking"
  const subtitleCls = focused ? 'text-[#E8B567]' : isOn ? 'text-white/70' : 'text-white/55';

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onEnterPress}
      className={[
        'relative flex items-center gap-5 h-[120px] px-7 rounded-2xl',
        'border text-white transition-all duration-200 cursor-pointer',
        cardCls,
      ].join(' ')}
    >
      {/* Icon circle */}
      <div className={[
        'shrink-0 grid place-items-center w-14 h-14 rounded-full border transition-colors',
        iconCls,
      ].join(' ')}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-[19px] font-medium tracking-tight text-white leading-tight">
          {title}
        </div>
        {subtitle && (
          <div className={[
            'font-serif italic text-[13px] font-light mt-1.5 transition-colors',
            subtitleCls,
          ].join(' ')}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Badge */}
      {badge && <Badge label={badge.label} variant={badge.variant} />}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-4 mt-2">
      <span className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────────────────────

function BackButton({ focusKey: btnKey, onPress }: { focusKey: string; onPress: () => void }) {
  const { ref, focused } = useFocusable({ focusKey: btnKey, onEnterPress: onPress });
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onPress}
      className={[
        'grid place-items-center w-14 h-14 rounded-full border transition-all duration-200 cursor-pointer',
        focused
          ? 'text-[#E8B567] border-[#E8B567]/55 bg-[#E8B567]/[0.06] scale-[1.05]'
          : 'text-white/65 border-white/[0.08] hover:text-white hover:border-white/20',
      ].join(' ')}
    >
      <IconChevronLeft />
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function ModalBase({
  focusKey: modalKey,
  initialFocus,
  title,
  children,
  onClose,
}: {
  focusKey: string;
  initialFocus: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: modalKey,
    isFocusBoundary: true,
    focusable: false,
  });
  useEffect(() => { setFocus(initialFocus); }, [setFocus, initialFocus]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-[#161210] border border-white/[0.08] rounded-2xl p-8 w-[560px] max-h-[76vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-[28px] font-light text-white tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="text-white/35 hover:text-white/70 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

// ─── Modal close button ───────────────────────────────────────────────────────

function ModalCloseBtn({ focusKey: btnKey, onPress, label = 'Kapat' }: { focusKey: string; onPress: () => void; label?: string }) {
  const { ref, focused } = useFocusable({ focusKey: btnKey, onEnterPress: onPress });
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className={[
        'px-5 py-2.5 rounded-xl text-[15px] font-medium transition-all',
        focused
          ? 'bg-[#E8B567] text-[#0e0b0a] shadow-[0_0_24px_-6px_#E8B567]'
          : 'bg-white/[0.08] text-white/65 hover:bg-white/[0.12]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ─── Focusable checkbox row (kategori gizle modalleri) ───────────────────────

function CheckItem({
  focusKey: itemKey, label, count, checked, isLast, onToggle,
}: {
  focusKey: string; label: string; count?: number;
  checked: boolean; isLast: boolean; onToggle: () => void;
}) {
  const { ref, focused, setFocus } = useFocusable({
    focusKey: itemKey,
    onEnterPress: onToggle,
    onArrowPress: (dir) => {
      // Son satırdan DOWN → Kapat butonuna — focusKey convention: modalKey + '-close'
      // Her modal kendi closeKey'ini geçemez, bu yüzden suffix pattern kullanıyoruz.
      // Aşağıdaki mantık: isLast ise DOWN'u tüket; parent ModalBase isFocusBoundary
      // sayesinde focus sızmaz zaten, ama explicit route daha güvenli.
      if (dir === 'down' && isLast) {
        // focusKey'in prefix'ini çözümle: "hide-cat-item-X" → "hide-cat-close"
        const closeKey = itemKey.replace(/-item-.*$/, '-close');
        setFocus(closeKey);
        return false;
      }
      return true;
    },
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onToggle}
      className={[
        'flex items-center gap-4 px-3 py-2.5 rounded-xl text-left w-full transition-all',
        focused ? 'bg-white/[0.07] outline outline-2 outline-white/20 outline-offset-[-2px]' : 'hover:bg-white/[0.04]',
      ].join(' ')}
    >
      <span className={[
        'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
        checked ? 'bg-[#E8B567] border-[#E8B567]' : 'border-white/30 bg-transparent',
      ].join(' ')}>
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-[16px] text-white/80">{label}</span>
      {count !== undefined && (
        <span className="font-serif text-[14px] font-light text-white/35 tabular-nums">{count}</span>
      )}
    </button>
  );
}

// ─── Modal: Canlı Kategorileri Gizle ─────────────────────────────────────────

function HideCategoriesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const allCategories = usePlaylistStore((s) => s.categories);
  const hiddenCategories = usePlaylistStore((s) => s.hiddenCategories);
  const toggleHidden = usePlaylistStore((s) => s.toggleHiddenCategory);

  return (
    <ModalBase
      focusKey="HIDE_CAT_MODAL"
      initialFocus={allCategories.length > 0 ? 'hide-cat-item-0' : 'hide-cat-close'}
      title={t('modal.hide_categories.title')}
      onClose={onClose}
    >
      <p className="font-serif italic text-[14px] text-white/45 mb-5">
        {t('modal.hide_categories.description')}
      </p>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
        {allCategories.map((cat, idx) => (
          <CheckItem
            key={cat.name}
            focusKey={`hide-cat-item-${idx}`}
            label={cat.name}
            count={cat.count}
            checked={hiddenCategories.has(cat.name)}
            isLast={idx === allCategories.length - 1}
            onToggle={() => void toggleHidden(cat.name)}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <ModalCloseBtn focusKey="hide-cat-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── Modal: Film Kategorilerini Gizle ────────────────────────────────────────

function HideVodCategoriesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const allCategories = useMoviesStore((s) => s.categories);
  const hiddenCategoryIds = useMoviesStore((s) => s.hiddenCategoryIds);
  const toggleHidden = useMoviesStore((s) => s.toggleHiddenCategory);

  const regulars = allCategories.filter(
    (c) => c.id !== '__resume__' && c.id !== '__favorites__'
  );

  return (
    <ModalBase
      focusKey="HIDE_VOD_CAT_MODAL"
      initialFocus={regulars.length > 0 ? 'hide-vod-cat-item-0' : 'hide-vod-cat-close'}
      title={t('modal.hide_vod_categories.title')}
      onClose={onClose}
    >
      <p className="font-serif italic text-[14px] text-white/45 mb-5">
        {t('modal.hide_vod_categories.description')}
      </p>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
        {regulars.length === 0 && (
          <p className="font-serif italic text-[14px] text-white/35 px-3 py-4">
            {t('modal.hide_vod_categories.not_loaded')}
          </p>
        )}
        {regulars.map((cat, idx) => (
          <CheckItem
            key={cat.id}
            focusKey={`hide-vod-cat-item-${idx}`}
            label={cat.label}
            count={cat.count}
            checked={hiddenCategoryIds.includes(cat.id)}
            isLast={idx === regulars.length - 1}
            onToggle={() => toggleHidden(cat.id)}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <ModalCloseBtn focusKey="hide-vod-cat-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── Modal: Dizi Kategorilerini Gizle ────────────────────────────────────────

function HideSeriesCategoriesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const allCategories = useSeriesStore((s) => s.categories);
  const hiddenCategoryIds = useSeriesStore((s) => s.hiddenCategoryIds);
  const toggleHidden = useSeriesStore((s) => s.toggleHiddenCategory);

  const regulars = allCategories.filter(
    (c) => c.id !== '__resume__' && c.id !== '__watchlist__'
  );

  return (
    <ModalBase
      focusKey="HIDE_SERIES_CAT_MODAL"
      initialFocus={regulars.length > 0 ? 'hide-series-cat-item-0' : 'hide-series-cat-close'}
      title={t('modal.hide_series_categories.title')}
      onClose={onClose}
    >
      <p className="font-serif italic text-[14px] text-white/45 mb-5">
        {t('modal.hide_series_categories.description')}
      </p>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
        {regulars.length === 0 && (
          <p className="font-serif italic text-[14px] text-white/35 px-3 py-4">
            {t('modal.hide_series_categories.not_loaded')}
          </p>
        )}
        {regulars.map((cat, idx) => (
          <CheckItem
            key={cat.id}
            focusKey={`hide-series-cat-item-${idx}`}
            label={cat.label}
            count={cat.count}
            checked={hiddenCategoryIds.includes(cat.id)}
            isLast={idx === regulars.length - 1}
            onToggle={() => toggleHidden(cat.id)}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <ModalCloseBtn focusKey="hide-series-cat-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── Modal: Dil Seçimi ───────────────────────────────────────────────────────

const LANGUAGES: { code: Language; name: string; tag: string }[] = [
  { code: 'tr', name: 'Türkçe',   tag: 'TR' },
  { code: 'en', name: 'English',  tag: 'EN' },
  { code: 'de', name: 'Deutsch',  tag: 'DE' },
  { code: 'fr', name: 'Français', tag: 'FR' },
  { code: 'es', name: 'Español',  tag: 'ES' },
];

// ─── Focusable language row ───────────────────────────────────────────────────

function LangItem({
  code, name, tag, isSelected, isLast, onSelect,
}: {
  code: string; name: string; tag: string;
  isSelected: boolean; isLast: boolean;
  onSelect: () => void;
}) {
  const { ref, focused, setFocus } = useFocusable({
    focusKey: `lang-item-${code}`,
    onEnterPress: onSelect,
    onArrowPress: (dir) => {
      // Son satırdan DOWN → Kapat butonuna
      if (dir === 'down' && isLast) { setFocus('lang-modal-close'); return false; }
      return true;
    },
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onSelect}
      className={[
        'flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all w-full',
        isSelected
          ? 'bg-[#E8B567]/[0.12] border border-[#E8B567]/40 text-[#E8B567]'
          : 'bg-white/[0.03] border border-white/[0.06] text-white/75',
        focused && !isSelected ? 'outline outline-2 outline-white/30 outline-offset-[-2px] bg-white/[0.07] text-white' : '',
        focused &&  isSelected ? 'outline outline-2 outline-[#E8B567]/60 outline-offset-[-2px]' : '',
      ].join(' ')}
    >
      <span className={[
        'shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded',
        isSelected ? 'bg-[#E8B567]/20 text-[#E8B567]' : 'bg-white/[0.06] text-white/40',
      ].join(' ')}>
        {tag}
      </span>
      <span className="flex-1 text-[17px] font-medium">{name}</span>
      {isSelected && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}

// ─── Modal: Dil Seçimi ────────────────────────────────────────────────────────

function LanguageModal({ onClose }: { onClose: () => void }) {
  const { t }   = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  return (
    <ModalBase
      focusKey="LANGUAGE_MODAL"
      initialFocus={`lang-item-${language}`}
      title={t('modal.language.title')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2 mb-6">
        {LANGUAGES.map((lang, idx) => (
          <LangItem
            key={lang.code}
            code={lang.code}
            name={lang.name}
            tag={lang.tag}
            isSelected={language === lang.code}
            isLast={idx === LANGUAGES.length - 1}
            onSelect={() => { setLanguage(lang.code); onClose(); }}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <ModalCloseBtn focusKey="lang-modal-close" onPress={onClose} label={t('modal.close')} />
      </div>
    </ModalBase>
  );
}

// ─── Modal: Altyazı Ayarları ─────────────────────────────────────────────────

const SUBTITLE_SIZES: { value: SubtitleSize; labelKey: string }[] = [
  { value: 'small',  labelKey: 'settings.subtitle_settings.size_small'  },
  { value: 'medium', labelKey: 'settings.subtitle_settings.size_medium' },
  { value: 'large',  labelKey: 'settings.subtitle_settings.size_large'  },
];

function SubtitleSettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { subtitleEnabled, subtitleSize, setSubtitleEnabled, setSubtitleSize } =
    useSettingsStore();

  return (
    <ModalBase
      focusKey="SUBTITLE_MODAL"
      initialFocus="subtitle-toggle"
      title={t('settings.subtitle_settings.title')}
      onClose={onClose}
    >
      {/* ── Gösterim ── */}
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">
        {t('settings.subtitle_settings.section_display')}
      </p>
      <div className="flex gap-3 mb-6">
        {[true, false].map((val, idx) => {
          const isActive = subtitleEnabled === val;
          const label = val
            ? t('settings.subtitle_settings.toggle_on')
            : t('settings.subtitle_settings.toggle_off');
          return (
            <SubtitleToggleBtn
              key={String(val)}
              focusKey={idx === 0 ? 'subtitle-toggle' : 'subtitle-toggle-off'}
              label={label}
              isActive={isActive}
              onSelect={() => setSubtitleEnabled(val)}
            />
          );
        })}
      </div>

      {/* ── Yazı Boyutu ── */}
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">
        {t('settings.subtitle_settings.section_size')}
      </p>
      <div className="flex flex-col gap-2 mb-6">
        {SUBTITLE_SIZES.map((opt, idx) => (
          <LangItem
            key={opt.value}
            code={opt.value}
            name={t(opt.labelKey)}
            tag={t(opt.labelKey).slice(0, 1).toUpperCase()}
            isSelected={subtitleSize === opt.value}
            isLast={idx === SUBTITLE_SIZES.length - 1}
            onSelect={() => { setSubtitleSize(opt.value); }}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <ModalCloseBtn focusKey="subtitle-close" onPress={onClose} label={t('modal.close')} />
      </div>
    </ModalBase>
  );
}

// Toggle button — Açık / Kapalı için yan yana butonlar
function SubtitleToggleBtn({
  focusKey: btnKey, label, isActive, onSelect,
}: {
  focusKey: string; label: string; isActive: boolean; onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({ focusKey: btnKey, onEnterPress: onSelect });
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onSelect}
      className={[
        'px-5 py-2.5 rounded-xl text-[15px] font-medium transition-all border',
        isActive
          ? 'bg-[#E8B567]/15 border-[#E8B567]/40 text-[#E8B567]'
          : 'bg-white/[0.04] border-white/[0.08] text-white/45',
        focused ? 'outline outline-2 outline-white/30 outline-offset-[-2px]' : '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ─── Modal: Parental Detail ───────────────────────────────────────────────────

function ParentalDetailModal({
  onClose,
  onCreatePin,
  onChangePin,
  onRemovePin,
}: {
  onClose:    () => void;
  onCreatePin: () => void;
  onChangePin: () => void;
  onRemovePin: () => void;
}) {
  const { t } = useTranslation();
  const pinHash           = useParentalStore((s) => s.pinHash);
  const protectedCategories = useParentalStore((s) => s.protectedCategories);
  const toggleProtected   = useParentalStore((s) => s.toggleProtected);
  const autoDetect        = useParentalStore((s) => s.autoDetectProtected);
  const allCategories     = usePlaylistStore((s) => s.categories);

  return (
    <ModalBase
      focusKey="PARENTAL_MODAL"
      initialFocus={pinHash && allCategories.length > 0 ? 'parental-cat-item-0' : 'parental-close'}
      title={t('modal.parental.title')}
      onClose={onClose}
    >
      <p className="font-serif italic text-[14px] text-white/45 mb-6">
        {pinHash
          ? t('modal.parental.pin_active')
          : t('modal.parental.pin_not_set')}
      </p>
      <div className="flex flex-wrap gap-3 mb-6">
        {!pinHash ? (
          /* ── PIN yokken: sadece Belirle ── */
          <button
            onClick={onCreatePin}
            className="px-4 py-2 rounded-xl bg-[#E8B567]/15 border border-[#E8B567]/35 text-[#E8B567] text-[14px] font-medium hover:bg-[#E8B567]/25 transition-colors"
          >
            {t('modal.parental.set_pin')}
          </button>
        ) : (
          /* ── PIN varken: Değiştir + Kaldır + Otomatik ── */
          <>
            <button
              onClick={onChangePin}
              className="px-4 py-2 rounded-xl bg-[#E8B567]/15 border border-[#E8B567]/35 text-[#E8B567] text-[14px] font-medium hover:bg-[#E8B567]/25 transition-colors"
            >
              {t('modal.parental.change_pin')}
            </button>
            <button
              onClick={onRemovePin}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[14px] hover:bg-red-500/20 transition-colors"
            >
              {t('modal.parental.remove_pin')}
            </button>
            <button
              onClick={() => void autoDetect(allCategories.map((c) => c.name))}
              className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/60 text-[14px] hover:bg-white/[0.1] transition-colors"
            >
              {t('modal.parental.auto_mark')}
            </button>
          </>
        )}
      </div>
      {pinHash && (
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">{t('modal.parental.protected_categories')}</p>
          {allCategories.map((cat, idx) => (
            <CheckItem
              key={cat.name}
              focusKey={`parental-cat-item-${idx}`}
              label={cat.name}
              count={cat.count}
              checked={protectedCategories.has(cat.name)}
              isLast={idx === allCategories.length - 1}
              onToggle={() => void toggleProtected(cat.name)}
            />
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <ModalCloseBtn focusKey="parental-close" onPress={onClose} />
      </div>
    </ModalBase>
  );
}

// ─── webOS device info ────────────────────────────────────────────────────────

function useDeviceInfo() {
  const [mac, setMac] = useState('—');
  useEffect(() => {
    try {
      const w = window as unknown as {
        webOS?: { deviceInfo?: (cb: (i: { serialNumber?: string; macAddress?: string }) => void) => void };
      };
      w.webOS?.deviceInfo?.((i) => {
        if (i.macAddress) setMac(i.macAddress);
      });
    } catch { /* not on webOS */ }
  }, []);
  return { mac };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Modal =
  | 'parental-unlock'        // PIN kapısı — önce burası açılır
  | 'parental-detail'        // PIN doğrulandıktan sonra
  | 'parental-setup'         // create
  | 'parental-change'        // change (mevcut + yeni)
  | 'parental-remove'        // remove (mevcut doğrula → sil)
  | 'hide-categories'        // Canlı TV kategorileri
  | 'hide-vod-categories'    // Film kategorileri
  | 'hide-series-categories' // Dizi kategorileri
  | 'language'               // Dil seçimi
  | 'subtitle-settings'     // Altyazı ayarları
  | null;

export function SettingsScreen() {
  const { t }                = useTranslation();
  const navigate             = useUIStore((s) => s.navigate);
  const pinHash              = useParentalStore((s) => s.pinHash);
  const unlockedThisSession  = useParentalStore((s) => s.unlockedThisSession);
  const lockSession          = useParentalStore((s) => s.lockSession);
  const hiddenCategories     = usePlaylistStore((s) => s.hiddenCategories);
  const { mac } = useDeviceInfo();
  const [modal, setModal] = useState<Modal>(null);
  const { timeFormat, setTimeFormat, language, subtitleEnabled, subtitleSize } = useSettingsStore();

  const { ref, focusKey, setFocus } = useFocusable({ focusKey: 'SETTINGS_SCREEN' });

  useEffect(() => { setTimeout(() => setFocus('settings-card-privacy-0'), 80); }, [setFocus]);

  const v2Stub = useCallback(() => { useToast.getState().show(t('settings.v2_coming')); }, [t]);

  // ── Geçmiş temizleme ─────────────────────────────────────────────────────────

  const handleClearChannelHistory = useCallback(() => {
    usePlaylistStore.setState({ recentIds: [] });
    usePlaylistStore.getState().recomputeVisibility();
    useToast.getState().show(t('settings.history_channels.cleared'));
  }, [t]);

  const handleClearMovieHistory = useCallback(() => {
    useMoviesStore.setState({ watchProgress: {} });
    useMoviesStore.getState()._updateSpecials();
    useMoviesStore.getState()._recompute();
    useToast.getState().show(t('settings.history_movies.cleared'));
  }, [t]);

  const handleClearSeriesHistory = useCallback(() => {
    useSeriesStore.setState({ watchProgress: {}, currentEpisode: {} });
    useSeriesStore.getState()._updateSpecials();
    useSeriesStore.getState()._recompute();
    useToast.getState().show(t('settings.history_series.cleared'));
  }, [t]);

  // ── Dynamic values ──────────────────────────────────────────────────────────
  const hiddenCount = hiddenCategories.size;
  const hiddenVodCount = useMoviesStore((s) => s.hiddenCategoryIds).length;
  const hiddenSeriesCount = useSeriesStore((s) => s.hiddenCategoryIds).length;
  const recentCount = usePlaylistStore((s) => s.recentIds).length;
  const watchedMovieCount = useMoviesStore((s) => Object.keys(s.watchProgress).length);
  const watchedSeriesCount = useSeriesStore((s) => Object.keys(s.watchProgress).length);

  type FullCard = {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    badge?: { label: string; variant: 'on' | 'off' };
    onPress: () => void;
  };

  // ── Gizlilik & Görünürlük — satır 1: kontroller ──────────────────────────────
  const privacyRow1Cards: FullCard[] = [
    {
      id: 'privacy-0',
      icon: <IconLock />,
      title: t('settings.parental.title'),
      subtitle: pinHash ? t('settings.parental.enabled') : t('settings.parental.disabled'),
      badge: { label: pinHash ? t('settings.badge.on') : t('settings.badge.off'), variant: pinHash ? 'on' : 'off' },
      onPress: () => {
        if (!pinHash)              { setModal('parental-setup');  return; }
        if (unlockedThisSession)   { setModal('parental-detail'); return; }
        setModal('parental-unlock');
      },
    },
    {
      id: 'privacy-1',
      icon: <IconGlobe />,
      title: t('settings.language.title'),
      subtitle: LANGUAGE_NAMES[language],
      onPress: () => setModal('language'),
    },
    {
      id: 'privacy-2',
      icon: <IconSubtitle />,
      title: t('settings.subtitle_settings.title'),
      subtitle: subtitleEnabled
        ? t('settings.subtitle_settings.subtitle_on', { size: t(`settings.subtitle_settings.size_${subtitleSize}`) })
        : t('settings.subtitle_settings.subtitle_off'),
      onPress: () => setModal('subtitle-settings'),
    },
  ];

  // ── Gizlilik & Görünürlük — satır 2: kategori gizleme ────────────────────────
  const hideCategoryCards: FullCard[] = [
    {
      id: 'privacy-3',
      icon: <IconEyeOff />,
      title: t('settings.hide_live.title'),
      subtitle: hiddenCount > 0 ? t('settings.hide_live.hidden_count', { count: hiddenCount }) : t('settings.hide_live.all_visible'),
      badge: { label: hiddenCount > 0 ? t('settings.badge.on') : t('settings.badge.off'), variant: hiddenCount > 0 ? 'on' : 'off' },
      onPress: () => setModal('hide-categories'),
    },
    {
      id: 'privacy-4',
      icon: <IconEyeOff />,
      title: t('settings.hide_movies.title'),
      subtitle: hiddenVodCount > 0 ? t('settings.hide_movies.hidden_count', { count: hiddenVodCount }) : t('settings.hide_movies.all_visible'),
      badge: { label: hiddenVodCount > 0 ? t('settings.badge.on') : t('settings.badge.off'), variant: hiddenVodCount > 0 ? 'on' : 'off' },
      onPress: () => setModal('hide-vod-categories'),
    },
    {
      id: 'privacy-5',
      icon: <IconEyeOff />,
      title: t('settings.hide_series.title'),
      subtitle: hiddenSeriesCount > 0 ? t('settings.hide_series.hidden_count', { count: hiddenSeriesCount }) : t('settings.hide_series.all_visible'),
      badge: { label: hiddenSeriesCount > 0 ? t('settings.badge.on') : t('settings.badge.off'), variant: hiddenSeriesCount > 0 ? 'on' : 'off' },
      onPress: () => setModal('hide-series-categories'),
    },
  ];

  const historyCards: FullCard[] = [
    {
      id: 'history-0',
      icon: <IconTrash />,
      title: t('settings.history_channels.title'),
      subtitle: recentCount > 0 ? t('settings.history_channels.count', { count: recentCount }) : t('settings.history_channels.empty'),
      onPress: handleClearChannelHistory,
    },
    {
      id: 'history-1',
      icon: <IconTrash />,
      title: t('settings.history_movies.title'),
      subtitle: watchedMovieCount > 0 ? t('settings.history_movies.count', { count: watchedMovieCount }) : t('settings.history_movies.empty'),
      onPress: handleClearMovieHistory,
    },
    {
      id: 'history-2',
      icon: <IconTrash />,
      title: t('settings.history_series.title'),
      subtitle: watchedSeriesCount > 0 ? t('settings.history_series.count', { count: watchedSeriesCount }) : t('settings.history_series.empty'),
      onPress: handleClearSeriesHistory,
    },
  ];

  const formatCards: FullCard[] = [
    {
      id: 'format-0',
      icon: <IconClock />,
      title: t('settings.time_format.title'),
      subtitle: t(timeFormat === '24h' ? 'settings.time_format.value_24h' : 'settings.time_format.value_12h'),
      onPress: () => setTimeFormat(timeFormat === '24h' ? '12h' : '24h'),
    },
    {
      id: 'format-2',
      icon: <IconRefresh />,
      title: t('settings.auto_refresh.title'),
      subtitle: t('settings.auto_refresh.subtitle'),
      badge: { label: t('settings.badge.on'), variant: 'on' },
      onPress: v2Stub,
    },
  ];

  return (
    <FocusContext.Provider value={focusKey}>
      {/* Main scroll container — matches HTML: flex-1 overflow-y-auto px-16 pt-10 pb-6 */}
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative flex-1 h-full overflow-y-auto px-16 pt-10 pb-6 bg-bg-base"
      >

        {/* ─── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 mb-12">
          <BackButton focusKey="settings-back" onPress={() => navigate('home')} />
          <div className="flex flex-col leading-none">
            <span className="text-[11px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold mb-2">
              {t('settings.subtitle')} · Versiyon 2.6
            </span>
            <span className="font-serif text-[56px] font-light tracking-tight text-white leading-none">
              {t('settings.title')}
            </span>
          </div>
        </div>

        {/* ─── Gizlilik & Görünürlük ───────────────────────────────────────── */}
        <div>
          <SectionHeader label={t('settings.sections.privacy')} />
          {/* Satır 1: Ebeveyn Kontrolü · Dili Değiştir · Önbelleği Temizle */}
          <div className="grid grid-cols-3 gap-5">
            {privacyRow1Cards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
          {/* Satır 2: 3 kategori gizleme butonu */}
          <div className="grid grid-cols-3 gap-5 mt-5">
            {hideCategoryCards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
        </div>

        {/* ─── Geçmiş & Veri ───────────────────────────────────────────────── */}
        <div className="mt-10">
          <SectionHeader label={t('settings.sections.history')} />
          <div className="grid grid-cols-3 gap-5">
            {historyCards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
        </div>

        {/* ─── Biçim & Oynatma ─────────────────────────────────────────────── */}
        <div className="mt-10">
          <SectionHeader label={t('settings.sections.format')} />
          <div className="grid grid-cols-2 gap-5">
            {formatCards.map((card) => (
              <SettingsCard
                key={card.id}
                focusKey={`settings-card-${card.id}`}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                badge={card.badge}
                onEnterPress={card.onPress}
              />
            ))}
          </div>
        </div>

        {/* ─── Footer: MAC + Cihaz Anahtarı ────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-16">
          <div className="flex items-baseline gap-3">
            <span className="text-[12px] uppercase tracking-[0.3em] text-white/45 font-semibold">
              {t('settings.footer.mac')}
            </span>
            <span className="font-serif text-[19px] font-light tabular-nums text-[#E8B567] tracking-wide">
              {mac}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────────── */}

      {/* PIN kapısı — detail'den önce açılır */}
      {modal === 'parental-unlock' && (
        <PinSetupModal
          mode="verify"
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-0'), 50); }}
          onVerified={() => setModal('parental-detail')}
        />
      )}

      {modal === 'parental-setup' && (
        <PinSetupModal
          mode="create"
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-0'), 50); }}
        />
      )}

      {modal === 'parental-change' && (
        <PinSetupModal
          mode="change"
          onClose={() => setModal('parental-detail')}
        />
      )}

      {modal === 'parental-remove' && (
        <PinSetupModal
          mode="remove"
          onClose={() => setModal('parental-detail')}
        />
      )}

      {modal === 'parental-detail' && (
        <ParentalDetailModal
          onClose={() => {
            lockSession();   // modal kapanınca kilitle — sonraki açılışta tekrar PIN sor
            setModal(null);
            setTimeout(() => setFocus('settings-card-privacy-0'), 50);
          }}
          onCreatePin={() => setModal('parental-setup')}
          onChangePin={() => setModal('parental-change')}
          onRemovePin={() => setModal('parental-remove')}
        />
      )}

      {modal === 'hide-categories' && (
        <HideCategoriesModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-3'), 50); }}
        />
      )}

      {modal === 'hide-vod-categories' && (
        <HideVodCategoriesModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-4'), 50); }}
        />
      )}

      {modal === 'hide-series-categories' && (
        <HideSeriesCategoriesModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-5'), 50); }}
        />
      )}

      {modal === 'language' && (
        <LanguageModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-1'), 50); }}
        />
      )}

      {modal === 'subtitle-settings' && (
        <SubtitleSettingsModal
          onClose={() => { setModal(null); setTimeout(() => setFocus('settings-card-privacy-2'), 50); }}
        />
      )}

    </FocusContext.Provider>
  );
}
