"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";
import { importProductsAction, type ProductImportResult } from "@/actions/dashboard/product-import";
import { Button } from "@/components/ui/button";

interface ProductImportClientProps {
  sites: { id: string; name: string }[];
}

const sampleCsv = [
  "name,sku,barcode,category,price,cost,stock,low_stock",
  "Cold Coffee,COF-001,890100000001,Food,120,72,50,10",
  "Aloe Soap,CARE-002,890100000004,Personal Care,55,30,25,8",
].join("\n");

export function ProductImportClient({ sites }: ProductImportClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(async () => {
      const response = await importProductsAction(formData);
      setResult(response);
      if (response.success) {
        toast.success(`Import complete: ${response.created} created, ${response.updated} updated`);
        form.reset();
      } else {
        toast.error(response.error);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form ref={formRef} onSubmit={submitImport} className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Upload CSV</h2>
          <p className="text-sm text-muted-foreground">
            Required column: name. Optional columns: sku, barcode, category, price, cost, stock, low_stock.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Import Scope
          <select name="siteId" className="h-11 rounded-xl border border-border bg-background px-3">
            <option value="global">Global products</option>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Product CSV
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <Button type="submit" disabled={isPending} className="h-11 w-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isPending ? "Importing..." : "Import Products"}
        </Button>

        {result?.success && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Import complete</p>
            <p className="text-muted-foreground">
              {result.created} created, {result.updated} updated, {result.skipped} skipped.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                {result.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            )}
          </div>
        )}
      </form>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">CSV Format</h2>
          <p className="text-sm text-muted-foreground">Use this sample structure for a clean upload.</p>
        </div>
        <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-4 text-xs">{sampleCsv}</pre>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`}
          download="product-import-template.csv"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Download Template
        </a>
      </section>
    </div>
  );
}
