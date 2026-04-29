"use client";

// src/components/portal/inventory/product-form-client.tsx

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter }    from "next/navigation";
import { toast }        from "sonner";
import { createClient } from "@supabase/supabase-js";
import {
  createProductAction,
  updateProductAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  addProductImageAction,
  deleteProductImageAction,
  generateSkuAction,
} from "@/actions/portal/product";
import {
  ScanBarcode, Plus, Trash2, ImagePlus, Images,
  Loader2, X, Wand2, Info, Check,
  ChevronRight, Package, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/routes";
import { handleActionResult, showToast } from "@/lib/toast";

/* ── Types ───────────────────────────────────────────────────── */

interface ProductVariant {
  id:                string;
  name:              string;
  sku:               string | null;
  barcode:           string | null;
  costPrice:         number | null;
  sellingPrice:      number | null;
  stock:             number;
  lowStockThreshold: number | null;
  isActive:          boolean;
  deletedAt:         Date | null;
}
interface ProductImage  { id: string; url: string; storagePath: string; sortOrder: number }
interface Product {
  id: string; name: string; description: string | null; sku: string | null;
  barcode: string | null; categoryId: string | null; taxGroupId: string | null;
  costPrice: number | null; sellingPrice: number | null; stock: number;
  lowStockThreshold: number | null; hasVariants: boolean; isActive: boolean;
  images: ProductImage[]; variants: ProductVariant[];
}
interface CategoryOption { id: string; name: string }
interface TaxGroupOption  { id: string; name: string; rate: number }

/* ══════════════════════════════════════════════════════════════
   IMAGE UPLOADER + PICKER
══════════════════════════════════════════════════════════════ */

// ── How many images to show initially and load per scroll ──
const PAGE_SIZE    = 10;
const LOAD_MORE_BY = 5;

function ImageUploader({
  images, productId, masterProfileId, siteId, onAdd, onRemove,
}: {
  images: ProductImage[]; productId: string | null; masterProfileId: string;
  siteId: string | null; onAdd: (img: ProductImage) => void; onRemove: (id: string) => void;
}) {
  const [uploading,    setUploading]    = useState(false);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  // All images loaded from storage (across all products for this master)
  const [allImages,    setAllImages]    = useState<ProductImage[]>([]);
  const [loadingAll,   setLoadingAll]   = useState(false);
  // Search + filter state
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<"all" | "added" | "not_added">("all");
  // How many images are currently visible (starts at PAGE_SIZE, grows on scroll)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Load ALL images for this master account from Supabase ─
  // Lists the top-level masterProfileId/ folder, then each product subfolder
  async function openPicker() {
    setPickerOpen(true);
    setSearch("");
    setFilter("all");
    setVisibleCount(PAGE_SIZE);
    if (allImages.length > 0) return; // already loaded
    setLoadingAll(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // List all product subfolders under masterProfileId/
      const { data: folders } = await supabase.storage
        .from("product-images")
        .list(masterProfileId, { limit: 200 });

      if (!folders) { setLoadingAll(false); return; }

      // For each folder (product), list its images
      const allImgs: ProductImage[] = [];
      await Promise.all(
        folders.map(async (folder) => {
          const folderPath = `${masterProfileId}/${folder.name}`;
          const { data: files } = await supabase.storage
            .from("product-images")
            .list(folderPath, { limit: 500 });
          if (!files) return;
          files.forEach((file, i) => {
            const storagePath = `${folderPath}/${file.name}`;
            const { data: { publicUrl } } = supabase.storage
              .from("product-images")
              .getPublicUrl(storagePath);
            allImgs.push({
              id: storagePath,
              url: publicUrl,
              storagePath,
              sortOrder: allImgs.length + i,
            });
          });
        })
      );

      setAllImages(allImgs);
    } catch { showToast.error("Could not load images"); }
    setLoadingAll(false);
  }

  function isAlreadyAdded(sp: string) { return images.some((i) => i.storagePath === sp); }

  // ── Filtered + searched image list ────────────────────────
  const filtered = allImages.filter((img) => {
    const added = isAlreadyAdded(img.storagePath);
    if (filter === "added"     && !added) return false;
    if (filter === "not_added" &&  added) return false;
    if (search) {
      const name = img.storagePath.split("/").pop()?.toLowerCase() ?? "";
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // Images currently visible (for infinite scroll)
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // ── Infinite scroll via IntersectionObserver ──────────────
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((c) => c + LOAD_MORE_BY);
            setLoadingMore(false);
          }, 300); // small delay so spinner shows
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, filtered.length]);

  // Reset visible count when search/filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, filter]);

  async function handlePickImage(img: ProductImage) {
    if (!productId || isAlreadyAdded(img.storagePath)) return;
    const res = await addProductImageAction(productId, siteId, img.url, img.storagePath, images.length);
    if (res.success) {
      onAdd({ ...img, id: `temp-${Date.now()}`, sortOrder: images.length });
      showToast.success("Image added");
    } else {
      showToast.error(res.error);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !productId) return;
    setUploading(true);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { showToast.error(`${file.name} is not an image`); continue; }
      if (file.size > 5 * 1024 * 1024)    { showToast.error(`${file.name} exceeds 5MB`); continue; }
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `${masterProfileId}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(storagePath, file, { upsert: false });
      if (error) { showToast.error(`Upload failed: ${error.message}`); continue; }
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(storagePath);
      const res = await addProductImageAction(productId, siteId, publicUrl, storagePath, images.length);
      if (res.success) {
        const newImg = { id: `temp-${Date.now()}`, url: publicUrl, storagePath, sortOrder: images.length };
        onAdd(newImg);
        // Also add to allImages so it appears in picker immediately
        setAllImages((prev) => [...prev, newImg]);
        showToast.success("Image uploaded");
      } else {
        showToast.error(res.error);
      }
    }
    setUploading(false);
  }

  return (
    <div className="space-y-3">
      {/* Current product images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[...images].sort((a, b) => a.sortOrder - b.sortOrder).map((img) => (
            <div key={img.id} className="relative group w-24 h-24">
              <img src={img.url} alt=""
                className="w-24 h-24 object-cover rounded-xl border border-border" />
              <Button variant="ghost" size="icon-xs" onClick={() => onRemove(img.id)}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full
                  opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive/90">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => fileRef.current?.click()}
          disabled={uploading || !productId}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border
            rounded-xl text-sm text-muted-foreground hover:border-foreground/30
            hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload new"}
        </button>
        {productId && (
          <button onClick={openPicker}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl
              text-sm text-muted-foreground hover:border-foreground/30
              hover:text-foreground transition-colors">
            <Images className="h-4 w-4" /> Use existing
          </button>
        )}
        {!productId && (
          <p className="text-xs text-muted-foreground self-center">
            Save product first to add images
          </p>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />

      {/* ── Image Picker Modal ─────────────────────────────── */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Image Library"
        description="All images uploaded to your account — click to add to this product"
        size="xl">
        <>
          {/* Search + Filter bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename..."
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-background
                  text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            {/* Filter pills */}
            <div className="flex gap-1.5 shrink-0">
              {(["all", "not_added", "added"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    filter === f ? "pill-active" : "pill-inactive bg-muted"
                  }`}>
                  {f === "all" ? "All" : f === "not_added" ? "Not added" : "Added"}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          {!loadingAll && allImages.length > 0 && (
            <div className="px-4 py-2 border-b border-border shrink-0">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{visible.length}</span> of{" "}
                <span className="font-medium text-foreground">{filtered.length}</span> images
                {allImages.length !== filtered.length && ` (${allImages.length} total)`}
              </p>
            </div>
          )}

          {/* Scrollable image grid */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {loadingAll ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading your image library...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {search || filter !== "all" ? "No images match your search" : "No images uploaded yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {search || filter !== "all"
                    ? "Try a different search or filter"
                    : "Upload images to any product first"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {visible.map((img) => {
                    const added = isAlreadyAdded(img.storagePath);
                    const filename = img.storagePath.split("/").pop() ?? "";
                    return (
                      <button
                        key={img.storagePath}
                        onClick={() => handlePickImage(img)}
                        disabled={added}
                        title={filename}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all group
                          ${added
                            ? "border-foreground cursor-not-allowed"
                            : "border-transparent hover:border-foreground/50 cursor-pointer"
                          }`}>
                        <img
                          src={img.url}
                          alt={filename}
                          loading="lazy"
                          className="w-full aspect-square object-cover"
                        />
                        {/* Added overlay */}
                        {added && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        )}
                        {/* Filename tooltip on hover */}
                        {!added && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5
                            opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs truncate">{filename}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Sentinel div — triggers load more when scrolled into view */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-6 mt-2">
                    {loadingMore
                      ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      : <p className="text-xs text-muted-foreground">Scroll for more</p>
                    }
                  </div>
                )}

                {/* End of results */}
                {!hasMore && filtered.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    All {filtered.length} images shown
                  </p>
                )}
              </>
            )}
          </div>
        </>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VARIANT MODAL
══════════════════════════════════════════════════════════════ */

function VariantModal({
  variant, onSave, onDelete, onClose, isNew, currencySymbol, productImages,
}: {
  variant: Partial<ProductVariant> & { name: string };
  onSave: (data: Partial<ProductVariant>) => void;
  onDelete?: () => void;
  onClose: () => void;
  isNew: boolean;
  currencySymbol: string;
  productImages: ProductImage[];
}) {
  const [name,    setName]    = useState(variant.name);
  const [sku,     setSku]     = useState(variant.sku     ?? "");
  const [barcode, setBarcode] = useState(variant.barcode ?? "");
  const [cost,    setCost]    = useState(String(variant.costPrice    ?? ""));
  const [price,   setPrice]   = useState(String(variant.sellingPrice ?? ""));
  const [stock,   setStock]   = useState(String(variant.stock        ?? 0));
  const [imageUrl, setImageUrl]      = useState<string | null>(null);
  const [scanOpen, setScanOpen]      = useState(false);
  const [imgPicker, setImgPicker]    = useState(false);

  function handleSave() {
    if (!name.trim()) { showToast.error("Variant name is required"); return; }
    onSave({
      name: name.trim(), sku: sku || null, barcode: barcode || null,
      costPrice:    cost  ? parseFloat(cost)       : null,
      sellingPrice: price ? parseFloat(price)      : null,
      stock:        parseInt(stock, 10) || 0,
    });
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "Add Variant" : "Edit Variant"} size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {onDelete
            ? <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
            : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{isNew ? "Add Variant" : "Save Changes"}</Button>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Variant Name <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Small / Red" or "250ml"' className="h-10" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" className="h-10 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Barcode</Label>
            <div className="flex gap-1.5">
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type" className="h-10 font-mono flex-1" />
              <button onClick={() => setScanOpen(true)}
                className="h-10 w-10 flex items-center justify-center border border-border rounded-xl hover:bg-muted transition-colors shrink-0">
                <ScanBarcode className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cost Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencySymbol}</span>
              <Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" className="h-10 pl-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Selling Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencySymbol}</span>
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-10 pl-8" />
            </div>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Stock Quantity</Label>
            <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="h-10" />
          </div>
        </div>

        {/* Optional variant image */}
        <div className="space-y-1.5">
          <Label className="text-xs">Variant Image <span className="text-muted-foreground font-normal ml-1">optional</span></Label>
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="" className="w-16 h-16 object-cover rounded-xl border border-border" />
              <button onClick={() => setImageUrl(null)} className="text-xs text-destructive hover:underline">Remove</button>
            </div>
          ) : (
            <button onClick={() => setImgPicker(true)} disabled={productImages.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl
                text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Images className="h-4 w-4" />
              {productImages.length === 0 ? "Add product images first" : "Pick from product images"}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-4 border-t border-border">
        {onDelete ? (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
        ) : <div />}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>{isNew ? "Add Variant" : "Save Changes"}</Button>
        </div>
      </div>

      <BarcodeScanner 
        open={scanOpen} 
        onClose={() => setScanOpen(false)}
        onScan={(code) => { setBarcode(code); 
        setScanOpen(false); }} 
      />

      <Modal open={imgPicker} onClose={() => setImgPicker(false)} title="Pick Variant Image" size="sm">
        <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {productImages.map((img) => (
            <button key={img.id} onClick={() => { setImageUrl(img.url); setImgPicker(false); }}
              className={`rounded-xl overflow-hidden border-2 transition-all
                ${imageUrl === img.url ? "border-foreground" : "border-transparent hover:border-foreground/40"}`}>
              <img src={img.url} alt="" className="w-full aspect-square object-cover" />
            </button>
          ))}
        </div>
      </Modal>
    </Modal>
  );
}

/* ── Compact Variant Row ──────────────────────────────────────── */

function VariantCompactRow({ variant, currencySymbol, onClick }: {
  variant: ProductVariant; currencySymbol: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 bg-muted/30 border border-border
        rounded-xl hover:bg-muted/60 transition-colors text-left group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{variant.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {variant.sku && <span className="text-xs text-muted-foreground font-mono">{variant.sku}</span>}
          <span className="text-xs text-muted-foreground">Stock: {variant.stock}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        {variant.sellingPrice != null
          ? <span className="text-sm font-semibold">{currencySymbol}{variant.sellingPrice.toFixed(2)}</span>
          : <span className="text-xs text-muted-foreground">No price</span>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN FORM
══════════════════════════════════════════════════════════════ */

export function ProductFormClient({
  product, categories, taxGroups, siteId, masterProfileId, currencySymbol, backUrl,
}: {
  product?: Product; categories: CategoryOption[]; taxGroups: TaxGroupOption[];
  siteId: string | null; masterProfileId: string; currencySymbol: string; backUrl: string;
}) {
  const router  = useRouter();
  const isEdit  = !!product;
  const [isPending, startTransition] = useTransition();

  const [name,         setName]         = useState(product?.name               ?? "");
  const [description,  setDescription]  = useState(product?.description        ?? "");
  const [sku,          setSku]          = useState(product?.sku                ?? "");
  const [barcode,      setBarcode]      = useState(product?.barcode            ?? "");
  const [categoryId,   setCategoryId]   = useState(product?.categoryId         ?? "");
  const [taxGroupId,   setTaxGroupId]   = useState(product?.taxGroupId         ?? "");
  const [costPrice,    setCostPrice]    = useState(String(product?.costPrice    ?? ""));
  const [sellingPrice, setSellingPrice] = useState(String(product?.sellingPrice ?? ""));
  const [stock,        setStock]        = useState(String(product?.stock        ?? 0));
  const [lowStock,     setLowStock]     = useState(String(product?.lowStockThreshold ?? ""));
  const [hasVariants,  setHasVariants]  = useState(product?.hasVariants        ?? false);
  const [isActive,     setIsActive]     = useState(product?.isActive           ?? true);
  const [images,       setImages]       = useState<ProductImage[]>(product?.images ?? []);
  const [variants,     setVariants]     = useState<ProductVariant[]>((product?.variants ?? []).filter((v) => !v.deletedAt));
  const [editingVariant, setEditingVariant] = useState<ProductVariant | "new" | null>(null);
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false);

  async function handleGenerateSku() {
    if (!name.trim()) { showToast.error("Enter product name first"); return; }
    const { sku: generated } = await generateSkuAction(masterProfileId, name);
    setSku(generated);
  }

  function buildFormData() {
    const fd = new FormData();
    fd.append("name", name.trim()); fd.append("description", description.trim());
    fd.append("sku", sku.trim()); fd.append("barcode", barcode.trim());
    fd.append("categoryId", categoryId); fd.append("taxGroupId", taxGroupId);
    fd.append("hasVariants", String(hasVariants)); fd.append("isActive", String(isActive));
    if (!hasVariants) {
      fd.append("costPrice", costPrice); fd.append("sellingPrice", sellingPrice);
      fd.append("stock", stock); fd.append("lowStockThreshold", lowStock);
    }
    return fd;
  }

  function handleSave() {
    if (!name.trim()) { showToast.error("Product name is required"); return; }
    startTransition(async () => {
      if (isEdit) {
        const res = await updateProductAction(product.id, siteId, buildFormData());
        handleActionResult(res, "Product saved.")
      } else {
        const res = await createProductAction(siteId, buildFormData());
        if (res.success) {
          showToast.success("Product created.");
          router.push(siteId ? ROUTES.staff.inventory.product(siteId, res.productId) : ROUTES.dashboard.manage.products);
        } else showToast.error(res.error);
      }
    });
  }

  function handleVariantSave(data: Partial<ProductVariant>) {
    if (!product?.id) { showToast.error("Save product first to add variants"); return; }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name",         data.name              ?? "");
      fd.append("sku",          data.sku               ?? "");
      fd.append("barcode",      data.barcode           ?? "");
      fd.append("costPrice",    String(data.costPrice    ?? ""));
      fd.append("sellingPrice", String(data.sellingPrice ?? ""));
      fd.append("stock",        String(data.stock        ?? 0));

      if (editingVariant === "new") {
        const res = await createVariantAction(product.id, siteId, fd);
        if (res.success) {
          // Use real id from server — no more temp ids that break edits
          setVariants((p) => [...p, {
            id: res.variantId,   // ← real DB id
            deletedAt: null, isActive: true, lowStockThreshold: null,
            name: data.name ?? "", sku: data.sku ?? null, barcode: data.barcode ?? null,
            costPrice: data.costPrice ?? null, sellingPrice: data.sellingPrice ?? null,
            stock: data.stock ?? 0,
          }]);
          showToast.success("Variant added");
        } else showToast.error(res.error);
      } else if (editingVariant) {
        const res = await updateVariantAction(editingVariant.id, product.id, siteId, fd);
        if (res.success) {
          setVariants((p) => p.map((v) =>
            v.id === editingVariant.id ? { ...v, ...data } : v
          ));
          showToast.success("Variant updated");
        } else showToast.error(res.error);
      }
      setEditingVariant(null);
    });
  }

  function handleVariantDelete() {
    if (!product?.id || !editingVariant || editingVariant === "new") return;
    const variantId = editingVariant.id;
    startTransition(async () => {
      const res = await deleteVariantAction(variantId, product.id, siteId);
      if (res.success) { setVariants((p) => p.filter((v) => v.id !== variantId)); showToast.success("Variant removed"); }
      else showToast.error(res.error);
      setEditingVariant(null);
    });
  }

  function handleImageRemove(imageId: string) {
    startTransition(async () => {
      const res = await deleteProductImageAction(imageId, siteId);
      if (res.success) setImages((p) => p.filter((i) => i.id !== imageId));
      else showToast.error(res.error);
    });
  }

  return (
    <div className="max-w-2xl space-y-10">

      {/* Basic info */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Basic Info</h2>
        <div className="space-y-2">
          <Label>Product Name <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Classic White T-Shirt" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional product description..."
            className="w-full min-h-20 px-4 py-3 border border-border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SKU <span className="text-muted-foreground text-xs font-normal ml-1">Stock Keeping Unit</span></Label>
            <div className="flex gap-2">
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto-generate or type" className="h-11 flex-1 font-mono" />
              <button onClick={handleGenerateSku} title="Auto-generate SKU"
                className="h-11 w-11 flex items-center justify-center border border-border rounded-xl hover:bg-muted transition-colors shrink-0">
                <Wand2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Barcode</Label>
            <div className="flex gap-2">
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type" className="h-11 flex-1 font-mono" />
              <button onClick={() => setBarcodeScanOpen(true)}
                className="h-11 w-11 flex items-center justify-center border border-border rounded-xl hover:bg-muted transition-colors shrink-0">
                <ScanBarcode className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tax Group</Label>
            <select value={taxGroupId} onChange={(e) => setTaxGroupId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
              <option value="">No tax</option>
              {taxGroups.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Pricing & Stock */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pricing & Stock</h2>
        <button type="button" onClick={() => setHasVariants((p) => !p)}
          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all
            ${hasVariants ? "border-foreground bg-muted" : "border-border hover:border-foreground/30"}`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
            ${hasVariants ? "border-foreground bg-foreground" : "border-muted-foreground"}`}>
            {hasVariants && <div className="w-2 h-2 rounded-full bg-background" />}
          </div>
          <div>
            <p className="text-sm font-semibold">This product has variants</p>
            <p className="text-xs text-muted-foreground mt-0.5">Different sizes, colours, or pack sizes — each with their own price and stock</p>
          </div>
        </button>

        {!hasVariants && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                <Input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className="h-11 pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Selling Price</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                <Input type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" className="h-11 pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Alert <span className="text-muted-foreground text-xs font-normal ml-1">optional</span></Label>
              <Input type="number" min="0" value={lowStock} onChange={(e) => setLowStock(e.target.value)} placeholder="e.g. 5" className="h-11" />
            </div>
          </div>
        )}

        {hasVariants && (
          <div className="space-y-2">
            {!isEdit && (
              <div className="flex items-start gap-2 bg-warning-muted dark:bg-warning-muted/30 border border-warning dark:border-warning rounded-xl px-4 py-3">
                <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning dark:text-warning">Save the product first, then add variants from the edit page.</p>
              </div>
            )}
            {variants.map((v) => (
              <VariantCompactRow key={v.id} variant={v} currencySymbol={currencySymbol} onClick={() => setEditingVariant(v)} />
            ))}
            {isEdit && (
              <button onClick={() => setEditingVariant("new")}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border
                  rounded-xl text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors">
                <Plus className="h-4 w-4" /> Add Variant
              </button>
            )}
            {variants.length === 0 && isEdit && (
              <p className="text-sm text-muted-foreground text-center py-4">No variants added yet</p>
            )}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* Images */}
      <section className="space-y-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Images</h2>
        <ImageUploader images={images} productId={product?.id ?? null} masterProfileId={masterProfileId}
          siteId={siteId} onAdd={(img) => setImages((p) => [...p, img])} onRemove={handleImageRemove} />
      </section>

      <div className="border-t border-border" />

      {/* Status */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status</h2>
        <button type="button" onClick={() => setIsActive((p) => !p)}
          className={`flex items-center gap-4 px-4 py-4 rounded-xl border w-full text-left transition-all
            ${isActive ? "border-foreground bg-muted" : "border-border hover:border-foreground/30"}`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
            ${isActive ? "border-foreground bg-foreground" : "border-muted-foreground"}`}>
            {isActive && <div className="w-2 h-2 rounded-full bg-background" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{isActive ? "Active" : "Inactive"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isActive ? "Visible and available for sale" : "Hidden from checkout"}</p>
          </div>
        </button>
        <p className="text-xs text-muted-foreground">Out of Stock is set automatically when stock reaches zero.</p>
      </section>

      {/* Save */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => router.push(backUrl)} className="flex-1 h-11">Cancel</Button>
        <Button onClick={handleSave} disabled={isPending} className="flex-1 h-11">
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEdit ? "Save Changes" : "Create Product"}
        </Button>
      </div>

      {/* Variant modal */}
      {editingVariant !== null && (
        <VariantModal
          variant={editingVariant === "new" ? { name: "" } : editingVariant}
          isNew={editingVariant === "new"}
          onSave={handleVariantSave}
          onDelete={editingVariant !== "new" ? handleVariantDelete : undefined}
          onClose={() => setEditingVariant(null)}
          currencySymbol={currencySymbol}
          productImages={images}
        />
      )}

      {/* Barcode scanner */}
      <BarcodeScanner open={barcodeScanOpen} onClose={() => setBarcodeScanOpen(false)}
        onScan={(code) => { setBarcode(code); setBarcodeScanOpen(false); }} />
    </div>
  );
}