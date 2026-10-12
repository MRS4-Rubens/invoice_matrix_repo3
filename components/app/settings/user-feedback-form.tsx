'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bug,
  Sparkles,
  Palette,
  MessageSquare,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  FileText,
  Monitor,
  Check,
  RotateCcw,
  Star,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FeedbackCategory,
  FeedbackSeverity,
  MAX_ATTACHMENT_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '@/lib/validations/feedback';
import { sendFeedbackAction } from '@/lib/actions/feedback/send-feedback';

interface AttachedFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  base64: string;
  previewUrl?: string;
}

const CATEGORIES: Array<{
  id: FeedbackCategory;
  label: string;
  icon: React.ElementType;
  description: string;
  colorClass: string;
  activeBorder: string;
}> = [
  {
    id: 'bug',
    label: 'Bug Report',
    icon: Bug,
    description: 'Something is broken or not working as expected',
    colorClass: 'text-rose-600 bg-rose-500/10',
    activeBorder: 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 ring-1 ring-rose-500',
  },
  {
    id: 'feature_request',
    label: 'Feature Request',
    icon: Sparkles,
    description: 'Suggest a new tool, capability, or automation',
    colorClass: 'text-violet-600 bg-violet-500/10',
    activeBorder: 'border-violet-500 bg-violet-50/40 dark:bg-violet-950/20 ring-1 ring-violet-500',
  },
  {
    id: 'ui_ux',
    label: 'UI / UX Design',
    icon: Palette,
    description: 'Suggest improvements to styling, layouts, or flow',
    colorClass: 'text-amber-600 bg-amber-500/10',
    activeBorder: 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500',
  },
  {
    id: 'general',
    label: 'General Feedback',
    icon: MessageSquare,
    description: 'Share your thoughts, review, or compliments',
    colorClass: 'text-emerald-600 bg-emerald-500/10',
    activeBorder: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500',
  },
];

const SEVERITIES: Array<{ id: FeedbackSeverity; label: string; desc: string }> = [
  { id: 'low', label: 'Low', desc: 'Visual glitch / typo' },
  { id: 'medium', label: 'Medium', desc: 'Workaround exists' },
  { id: 'critical', label: 'Critical', desc: 'Blocks invoicing or billing' },
];

const RATING_LABELS = ['Frustrated', 'Disappointed', 'Okay', 'Good', 'Loved It!'];

export function UserFeedbackForm() {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium');
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  const [attachments, setAttachments] = useState<AttachedFileItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Diagnostics detected in browser
  const [clientDiagnostics, setClientDiagnostics] = useState<{
    browser: string;
    os: string;
    screenResolution: string;
    currentUrl: string;
  }>({
    browser: 'Browser',
    os: 'OS',
    screenResolution: '1920x1080',
    currentUrl: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect client diagnostics on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent;
    let browserName = 'Browser';
    if (ua.includes('Firefox')) browserName = 'Firefox';
    else if (ua.includes('Edg/')) browserName = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browserName = 'Chrome';
    else if (ua.includes('Safari')) browserName = 'Safari';

    let osName = 'Unknown OS';
    if (ua.includes('Win')) osName = 'Windows';
    else if (ua.includes('Mac')) osName = 'macOS';
    else if (ua.includes('Linux')) osName = 'Linux';
    else if (ua.includes('Android')) osName = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';

    const timer = setTimeout(() => {
      setClientDiagnostics({
        browser: browserName,
        os: osName,
        screenResolution: `${window.screen.width} x ${window.screen.height}`,
        currentUrl: window.location.href,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('bm_feedback_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        const timer = setTimeout(() => {
          if (parsed.category) setCategory(parsed.category);
          if (parsed.severity) setSeverity(parsed.severity);
          if (parsed.rating) setRating(parsed.rating);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.description) setDescription(parsed.description);
          setRestoredDraft(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-save draft on changes (excluding large attachments)
  useEffect(() => {
    if (submittedSuccess) return;
    try {
      const draft = { category, severity, rating, title, description };
      localStorage.setItem('bm_feedback_draft', JSON.stringify(draft));
    } catch {
      // Ignore quota errors
    }
  }, [category, severity, rating, title, description, submittedSuccess]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('bm_feedback_draft');
    } catch {}
    setTitle('');
    setDescription('');
    setCategory('bug');
    setSeverity('medium');
    setRating(5);
    setAttachments([]);
    setRestoredDraft(false);
  };

  // File handling
  const handleFilesSelected = async (files: FileList | null) => {
    setUploadError(null);
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > MAX_ATTACHMENT_COUNT) {
      setUploadError(`Maximum ${MAX_ATTACHMENT_COUNT} files allowed. Please remove a file first.`);
      return;
    }

    const currentTotalSize = attachments.reduce((sum, f) => sum + f.sizeBytes, 0);
    const newItems: AttachedFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
        setUploadError(`"${file.name}" is not supported. Please upload PNG, JPG, WebP, or PDF.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`"${file.name}" exceeds the 2.5 MB per-file limit. Please compress it.`);
        return;
      }

      if (currentTotalSize + file.size > MAX_TOTAL_SIZE_BYTES) {
        setUploadError('Combined attachment size exceeds the 10 MB total limit.');
        return;
      }

      // Convert to Base64 in memory
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          // Strip data:*/*;base64, prefix
          const cleanBase64 = res.split(',')[1] || '';
          resolve(cleanBase64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        base64,
        previewUrl,
      });
    }

    setAttachments((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setUploadError(null);
  };

  // Submit feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (title.trim().length < 3) {
      setGlobalError('Please enter a brief title of at least 3 characters.');
      return;
    }

    if (description.trim().length < 10) {
      setGlobalError('Please write at least 10 characters describing your feedback or issue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendFeedbackAction({
        category,
        severity: category === 'bug' ? severity : undefined,
        rating: category === 'general' ? rating : undefined,
        title: title.trim(),
        description: description.trim(),
        diagnostics: includeDiagnostics
          ? {
              ...clientDiagnostics,
              submittedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            }
          : undefined,
        attachments: attachments.map((a) => ({
          filename: a.name,
          contentBase64: a.base64,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        })),
      });

      if (result.success) {
        // Clear draft from localStorage on 100% successful send
        try {
          localStorage.removeItem('bm_feedback_draft');
        } catch {}

        setSubmittedSuccess(true);
        setTitle('');
        setDescription('');
        setAttachments([]);
        setRestoredDraft(false);
      } else {
        setGlobalError(result.error.message || 'Failed to submit feedback. Please try again.');
      }
    } catch {
      setGlobalError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Placeholder texts per category
  const getDescriptionPlaceholder = () => {
    switch (category) {
      case 'bug':
        return '1. What were you doing?\n2. What went wrong or did not work as expected?\n3. What did you expect to happen?';
      case 'feature_request':
        return 'Describe the tool or feature you would like to see added, and how it will improve your business billing workflow...';
      case 'ui_ux':
        return 'Which screen, form, or button can be improved? What visual change or layout adjustment would make it easier to use?';
      case 'general':
        return 'Share your overall experience, thoughts on Bill Matrix, or what you enjoy most about using the platform...';
    }
  };

  // Celebratory Success Card
  if (submittedSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-card p-6 sm:p-8 shadow-xs text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/20">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground font-heading tracking-tight">
          Feedback Successfully Dispatched!
        </h3>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Thank you for taking the time to share your feedback. Your notes and diagnostic details have been sent directly to the development inbox (<span className="font-semibold text-foreground">mcrsftrwds4@gmail.com</span>).
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          We review all submissions carefully to make Bill Matrix better for every business.
        </p>

        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            onClick={() => setSubmittedSuccess(false)}
            className="h-10 px-5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm"
          >
            Submit Another Feedback
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="size-5" />
            </div>
            <h2 className="text-2xl font-extrabold font-heading text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              User Feedback &amp; Suggestions
            </h2>
          </div>
          <p className="mt-0.5 text-sm sm:text-[15px] text-muted-foreground font-medium">
            Report bugs, request modern capabilities, or propose UI/UX enhancements. Sent directly to the founder inbox.
          </p>
        </div>

        {restoredDraft && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20">
              <RotateCcw className="size-3.5" /> Draft Restored
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs text-muted-foreground hover:text-rose-600 font-bold cursor-pointer underline"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {globalError && (
        <div className="my-3 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-sm text-destructive flex items-center gap-2 font-medium">
          <AlertCircle className="size-4.5 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        {/* 1. Category Selection Cards */}
        <div>
          <label className="block text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
            1. Select Category <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'flex flex-col text-left px-3 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-border/70 transition-all cursor-pointer hover:border-indigo-500/40 hover:shadow-2xs relative',
                    isSelected ? cat.activeBorder : 'bg-background hover:bg-muted/30'
                  )}
                >
                  {/* Line 1: Icon beside Heading + Checkmark on right */}
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('p-1.5 rounded-lg shrink-0', cat.colorClass)}>
                        <Icon className="size-4" />
                      </div>
                      <span className="text-sm sm:text-[15px] font-bold text-foreground truncate">
                        {cat.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="size-4.5 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Line 2: Information about that card */}
                  <span className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Category-Specific Fields */}
        {category === 'bug' && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10 px-3 py-2 sm:px-3.5 sm:py-2.5 space-y-1.5">
            <label className="block text-[12.5px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-400">
              Bug Severity Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id)}
                  className={cn(
                    'py-1.5 px-3 rounded-lg text-left border transition-all cursor-pointer flex items-center',
                    severity === sev.id
                      ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                      : 'border-border/60 bg-background text-foreground hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs sm:text-sm font-bold shrink-0">{sev.label}</span>
                    <span className={cn('text-xs sm:text-sm', severity === sev.id ? 'text-rose-200' : 'text-muted-foreground/60')}>-</span>
                    <span
                      className={cn(
                        'text-xs truncate font-medium',
                        severity === sev.id ? 'text-rose-100' : 'text-muted-foreground'
                      )}
                    >
                      {sev.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {category === 'general' && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10 px-3 py-2 sm:px-3.5 sm:py-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[13px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400">
                Your Overall Rating
              </label>
              <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                {RATING_LABELS[(hoveredRating || rating) - 1]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hoveredRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="p-1 text-amber-500 hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      className={cn('size-6', filled ? 'fill-amber-400 text-amber-500' : 'text-slate-300')}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Title & Summary */}
        <div>
          <label className="block text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
            2. Title / Summary <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              category === 'bug'
                ? 'e.g., Cannot export GSTR-1 Excel when invoices have no HSN'
                : category === 'feature_request'
                ? 'e.g., WhatsApp direct share link with PDF download button'
                : category === 'ui_ux'
                ? 'e.g., Make the invoice line items table scroll horizontally on smaller tablets'
                : 'e.g., Loving the fast invoice creation flow!'
            }
            maxLength={120}
            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
            required
          />
        </div>

        {/* 4. Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
              3. Detailed Description <span className="text-destructive">*</span>
            </label>
            <span className="text-xs font-medium text-muted-foreground">{description.length}/4000</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
            placeholder={getDescriptionPlaceholder()}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 font-medium placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all resize-y min-h-[80px]"
            required
          />
        </div>

        {/* 5. Screenshot / File Attachments (Zero DB / S3 Storage) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
              4. Screenshots / Attachments{' '}
              <span className="text-xs text-muted-foreground font-normal lowercase">(optional • max 4 files, 2.5 mb each)</span>
            </label>
            <span className="text-xs font-bold text-muted-foreground">
              {attachments.length} / {MAX_ATTACHMENT_COUNT} files
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          {/* Dropzone Card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-indigo-500/60 rounded-xl py-3 px-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-indigo-500/5 group"
          >
            <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:scale-105 transition-transform mb-1">
              <Upload className="size-5" />
            </div>
            <p className="text-sm sm:text-[15px] font-bold text-foreground">
              Click to browse or drop screenshots &amp; documents
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PNG, JPG, WebP, or PDF up to 2.5 MB each (attached in-memory to email with 0 bytes saved to cloud)
            </p>
          </div>

          {uploadError && (
            <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
              <AlertCircle className="size-4 shrink-0" />
              {uploadError}
            </p>
          )}

          {/* Free Compressor / Resizer Helper Banner (same as logo card) */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs sm:text-[13px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Info className="size-4 text-indigo-600 shrink-0" />
              Need to compress a high-res screenshot or screen recording image?
            </span>
            <a
              href="https://www.iloveimg.com/compress-image"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
            >
              <span>Compress free on iLoveIMG</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/80 bg-background text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {file.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.previewUrl}
                        alt="Preview"
                        className="size-9 rounded-lg object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="size-4.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(file.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Diagnostic Context Info */}
        <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 sm:px-3.5 sm:py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="size-4.5 text-slate-700 dark:text-slate-300" />
              <span className="text-[12.5px] font-bold text-foreground uppercase tracking-wide">
                Automatic Environment Context
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="rounded border-border text-indigo-600 focus:ring-indigo-500 size-4 cursor-pointer"
              />
              <span>Include diagnostics</span>
            </label>
          </div>

          {includeDiagnostics && (
            <div className="flex flex-wrap gap-1.5 pt-0.5 text-xs text-muted-foreground font-medium">
              <span className="rounded bg-background px-2 py-0.5 border border-border/80">
                Browser: <strong className="text-foreground">{clientDiagnostics.browser}</strong>
              </span>
              <span className="rounded bg-background px-2 py-0.5 border border-border/80">
                OS: <strong className="text-foreground">{clientDiagnostics.os}</strong>
              </span>
              <span className="rounded bg-background px-2 py-0.5 border border-border/80">
                Screen: <strong className="text-foreground">{clientDiagnostics.screenResolution}</strong>
              </span>
              <span className="rounded bg-background px-2 py-0.5 border border-border/80">
                Inbox: <strong className="text-foreground">mcrsftrwds4@gmail.com</strong>
              </span>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            Clear Form
          </button>

          <Button
            type="submit"
            disabled={isSubmitting || title.trim().length < 3 || description.trim().length < 10}
            className="h-10 px-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Dispatching Feedback...
              </>
            ) : (
              <>
                <MessageSquare className="size-4" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
