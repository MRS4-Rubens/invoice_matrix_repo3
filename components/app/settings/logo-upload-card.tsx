'use client';

import { useState, useRef, useTransition } from 'react';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  RefreshCw,
  Eye,
  Lock,
  Crown,
  ArrowRight
} from 'lucide-react';
import { uploadBusinessLogo } from '@/lib/actions/business/upload-logo';
import { removeBusinessLogo } from '@/lib/actions/business/remove-logo';
import { canUploadBusinessLogo } from '@/lib/subscriptions/entitlements';
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LogoUploadCardProps {
  business: {
    id: string;
    legal_name: string;
    trade_name?: string | null;
    logo_storage_key?: string | null;
    subscription_plan?: string | null;
    subscription_status?: string | null;
    trial_ends_at?: Date | string | null;
  } | null;
}

export function LogoUploadCard({ business }: LogoUploadCardProps) {
  const [isPending, startTransition] = useTransition();
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isLogoAllowed = canUploadBusinessLogo(business).allowed;
  
  // Local preview state
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Currently saved logo URL (with cache-busting timestamp state)
  const [savedLogoTimestamp, setSavedLogoTimestamp] = useState<number>(Date.now());
  const [hasSavedLogo, setHasSavedLogo] = useState<boolean>(Boolean(business?.logo_storage_key));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLogoUrl = business?.id && hasSavedLogo 
    ? `/api/business/${business.id}/logo?t=${savedLogoTimestamp}` 
    : null;

  const activeDisplayUrl = previewDataUrl || currentLogoUrl;

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Please upload a PNG, JPEG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSaveUpload = () => {
    if (!previewDataUrl || !selectedFile) return;

    startTransition(async () => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        const result = await uploadBusinessLogo({
          base64Data: previewDataUrl,
          mimeType: selectedFile.type,
          fileName: selectedFile.name,
        });

        if (result.success) {
          setHasSavedLogo(true);
          setSavedLogoTimestamp(Date.now());
          setPreviewDataUrl(null);
          setSelectedFile(null);
          setSuccessMessage('Business logo uploaded and saved successfully!');
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          setErrorMessage(result.error.message || 'Failed to upload logo.');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during upload.');
      }
    });
  };

  const handleCancelSelection = () => {
    setPreviewDataUrl(null);
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    if (!confirm('Are you sure you want to remove your business logo? Invoices will no longer display a logo.')) {
      return;
    }

    startTransition(async () => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        const result = await removeBusinessLogo({});
        if (result.success) {
          setHasSavedLogo(false);
          setPreviewDataUrl(null);
          setSelectedFile(null);
          setSuccessMessage('Business logo removed successfully.');
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          setErrorMessage(result.error.message || 'Failed to remove logo.');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to remove logo.');
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-6 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="size-4" />
            </div>
            <h2 className="text-lg font-bold font-heading text-foreground tracking-tight uppercase">
              Business Logo &amp; Brand Assets
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
            Your official business logo will automatically appear on printed invoices, tax templates, and PDFs.
          </p>
        </div>

        {!isLogoAllowed ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black border border-amber-500/25 shadow-2xs self-start sm:self-auto">
            <Crown className="size-3.5 text-amber-500" />
            Essentials Pro &amp; Enterprise
          </div>
        ) : hasSavedLogo && !selectedFile ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 self-start sm:self-auto">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Active on Invoices
          </div>
        ) : null}
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mt-4 mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs sm:text-sm font-semibold text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mt-4">
        {/* Left / Upload Area (50% Width) */}
        <div className="flex flex-col h-full justify-between">
          <input
            ref={fileInputRef}
            type="file"
            id="business-logo-input"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleChange}
            disabled={isPending || !isLogoAllowed}
          />

          <div
            onDragEnter={(e) => {
              if (!isLogoAllowed) return;
              handleDrag(e);
            }}
            onDragLeave={(e) => {
              if (!isLogoAllowed) return;
              handleDrag(e);
            }}
            onDragOver={(e) => {
              if (!isLogoAllowed) return;
              handleDrag(e);
            }}
            onDrop={(e) => {
              if (!isLogoAllowed) {
                e.preventDefault();
                setShowUpgradeModal(true);
                return;
              }
              handleDrop(e);
            }}
            onClick={() => {
              if (!isLogoAllowed) {
                setShowUpgradeModal(true);
                return;
              }
              fileInputRef.current?.click();
            }}
            className={cn(
              "relative flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-3 sm:px-4 sm:py-3.5 text-center transition-all select-none",
              !isLogoAllowed
                ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60 cursor-pointer"
                : dragActive
                ? "border-indigo-500 bg-indigo-500/10 scale-[1.01] cursor-pointer"
                : "border-border hover:border-indigo-500/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 bg-background/50 cursor-pointer",
              isPending && "opacity-60 pointer-events-none"
            )}
          >
            {!isLogoAllowed ? (
              <div className="flex flex-col items-center text-center w-full max-w-[480px]">
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-1.5 border border-amber-500/20 shadow-2xs">
                  <Crown className="size-4.5 sm:size-5 text-amber-500" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  Custom Brand Logo Upload
                </p>
                <p className="mt-0.5 text-[11.5px] sm:text-xs text-muted-foreground font-medium leading-relaxed text-center px-1">
                  Free accounts use our clean header layout. Upgrade to Essentials Pro to unlock high-resolution logo uploads on printed &amp; PDF invoices.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUpgradeModal(true);
                  }}
                  className="mt-1.5 sm:mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dfd3be] bg-gradient-to-b from-[#fdfbf7] to-[#f4eedb] px-3.5 py-1.5 text-xs font-bold text-amber-950 shadow-2xs hover:from-white hover:to-[#eee6d1] hover:border-amber-400/60 dark:from-amber-950/20 dark:to-amber-950/40 dark:border-amber-800/40 dark:text-amber-300 transition-all cursor-pointer"
                >
                  <Lock className="size-3.5 text-amber-700/80 dark:text-amber-400 shrink-0" />
                  <span>Unlock Logo Upload</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-black text-amber-700 dark:text-amber-300">
                    <Crown className="size-2.5 text-amber-600 dark:text-amber-400" />
                    PRO
                  </span>
                  <ArrowRight className="size-3.5 text-amber-700/80 dark:text-amber-400 shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-2 shadow-xs">
                  <Upload className="size-4.5 sm:size-5" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  {selectedFile ? selectedFile.name : hasSavedLogo ? 'Click or drag to replace logo' : 'Click to upload or drag and drop your logo'}
                </p>
                <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground font-medium">
                  PNG (recommended), JPEG, or WebP • Max file size: 5MB
                </p>
                <p className="mt-1 text-[10.5px] font-semibold text-indigo-600/80 dark:text-indigo-400/80">
                  Auto-fits proportionally into all 4 invoice templates
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right / Live Preview Simulation Area (50% Width) */}
        <div className="flex flex-col h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="size-3.5" />
              Live Invoice Simulation
            </span>
            {selectedFile && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Unsaved Preview
              </span>
            )}
          </div>

          {/* Mini Simulated Invoice Card */}
          <div className="flex-1 flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-3 sm:p-3.5 shadow-sm text-slate-900">
            {/* Checkerboard container for logo */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1.5">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div 
                  className="size-20 sm:size-[92px] shrink-0 rounded border border-slate-200 flex items-center justify-center p-1 overflow-hidden"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #e2e8f0 10%, transparent 11%), radial-gradient(circle, #e2e8f0 10%, #ffffff 11%)',
                    backgroundSize: '10px 10px',
                    backgroundPosition: '0 0, 5px 5px'
                  }}
                >
                  {activeDisplayUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeDisplayUrl}
                      alt="Business Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400 text-center uppercase leading-tight select-none">
                      No Logo
                    </span>
                  )}
                </div>

                <div className="leading-tight min-w-0 flex-1 pr-2">
                  <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-950 uppercase truncate">
                    {business?.trade_name || business?.legal_name || 'YOUR BUSINESS NAME'}
                  </h4>
                  <p className="text-[10.5px] font-bold text-slate-600 uppercase mt-0.5 tracking-tight">
                    GST INVOICING SUITE
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    GSTIN: 29ABCDE1234F1Z5
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2 self-start pt-0.5">
                <div className="border border-slate-900 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950 bg-slate-50 rounded shadow-2xs">
                  TAX INVOICE
                </div>
              </div>
            </div>

            {/* Bottom Section: Action Bar or Status Caption */}
            {selectedFile ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Preview
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveUpload}
                    disabled={isPending}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7.5 px-3 shadow-xs cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <RefreshCw className="size-3 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3 mr-1.5" />
                        Save Logo
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelSelection}
                    disabled={isPending}
                    size="sm"
                    className="text-xs font-semibold h-7.5 px-2.5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : hasSavedLogo ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>Active on Invoices</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="text-xs font-bold h-7.5 px-2.5 cursor-pointer border-slate-300 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 shadow-2xs"
                  >
                    <Upload className="size-3 mr-1.5" />
                    Replace Logo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={isPending}
                    className="text-xs font-bold h-7.5 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3 mr-1.5" />
                    Remove Logo
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[10px] sm:text-[10.5px] text-slate-500 italic text-center leading-tight pt-1 pb-0.5">
                Upload your logo to preview it on your invoices.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Helper Banner & iLoveIMG Link (Bottom) */}
      <div className="mt-5 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
        <div className="flex items-start gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 mt-0.5">
            <Sparkles className="size-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-foreground">
                Pro-Tip: Transparent PNG Recommended
              </span>
              <span className="text-muted-foreground/60 hidden sm:inline">-</span>
              <a
                href="https://www.iloveimg.com/remove-background"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-4 decoration-indigo-400/50 hover:decoration-indigo-600 transition-all cursor-pointer"
              >
                <span>Does your logo have a white background? Remove background for free on iLoveIMG</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed pt-0.5">
              Logos with a transparent background look cleanest on printed documents because they don&apos;t leave white boxes over template lines. Square, horizontal, or vertical logos are automatically scaled with zero distortion.
            </p>
          </div>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Unlock Custom Brand Logo"
        featureName="Custom Business Logo"
        description="Showcase your business branding on all printed invoices, GST estimates, and WhatsApp PDFs with automatic responsive scaling."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
    </div>
  );
}
