import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileSignature, ArrowRight, Receipt, Search, FileDown } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Badge from "../components/ui/Badge.jsx";
import Button from "../components/ui/Button.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatDate } from "../utils/format.js";
import {
  WORKFLOW_LABELS,
  quoteWorkflow
} from "../constants/quoteWorkflow.js";
import ProposalPdfBody from "../components/document/ProposalPdfBody.jsx";
import { downloadElementAsPdf, formatPdfErrorForUser } from "../utils/pdf.js";
import { useToast } from "../context/ModalContext.jsx";
import { isProjectActive } from "../utils/projectLifecycle.js";

export default function ContractsPage({ onOpenContract }) {
  const { remote } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const [filterId, setFilterId] = useState("active");
  const [query, setQuery] = useState("");
  const [pdfTarget, setPdfTarget] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfWrapRef = useRef(null);

  const items = useMemo(() => {
    if (!remote) return [];
    const quotes =
      user?.role === "producer"
        ? (remote.quotes || []).filter((q) => q.ownerUserId === user.id)
        : remote.quotes || [];

    return quotes
      .map((quote) => ({ project: quote, quote }))
      .sort((a, b) => (b.quote.date || "").localeCompare(a.quote.date || ""));
  }, [remote, user]);

  const filteredItems = useMemo(() => {
    const qLower = query.trim().toLocaleLowerCase("tr");
    return items.filter(({ project, quote }) => {
      const wf = quoteWorkflow(quote);
      let statusOk = false;
      if (filterId === "active") {
        statusOk = isProjectActive(quote) && !["contracted", "completed"].includes(wf);
      } else if (filterId === "inactive") {
        statusOk = !isProjectActive(quote);
      } else if (filterId === "contracted") {
        statusOk = ["contracted", "completed"].includes(wf);
      }
      if (!statusOk) return false;
      if (!qLower) return true;
      const hay = [
        project.projectName,
        project.customerName,
        String(quote.number)
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");
      return hay.includes(qLower);
    });
  }, [items, filterId, query]);

  useEffect(() => {
    if (!pdfTarget) return undefined;

    let cancelled = false;
    const target = pdfTarget;

    (async () => {
      setPdfBusy(true);
      try {
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 120));

        if (cancelled) return;

        const wrap = pdfWrapRef.current;
        const el = wrap?.querySelector?.("[data-yk-print-root]") || wrap;
        if (!el || !(el instanceof HTMLElement)) {
          toast.error("PDF için içerik bulunamadı");
          return;
        }

        let tries = 0;
        while (tries++ < 40 && el.offsetHeight < 4 && !cancelled) {
          await new Promise((r) => requestAnimationFrame(r));
        }
        if (cancelled) return;
        if (el.offsetHeight < 4) {
          toast.error("PDF için yerleşim tamamlanamadı");
          return;
        }

        const wf = quoteWorkflow(target.quote);
        const base = (target.project.projectName || "Teklif").replace(
          /[^\w\-.ğüşıöçĞÜŞİÖÇ ]+/gu,
          ""
        );
        await downloadElementAsPdf(el, `${base}-${target.quote.number}-${wf}`);
      } catch (err) {
        console.error("[yk-pdf]", err);
        toast.error(formatPdfErrorForUser(err, "PDF oluşturulamadı"));
      } finally {
        if (!cancelled) {
          setPdfTarget((cur) =>
            cur?.quote?.id === target.quote?.id &&
            cur?.project?.id === target.project?.id
              ? null
              : cur
          );
          setPdfBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setPdfBusy(false);
    };
  }, [pdfTarget, toast]);

  return (
    <>
      <div
        className="fixed left-0 top-0 z-[60] w-[210mm] max-w-[100vw] max-h-[100vh] overflow-auto opacity-[0.02] pointer-events-none bg-white print:relative print:z-auto print:opacity-100"
        aria-hidden
      >
        {pdfTarget && (
          <div ref={pdfWrapRef}>
            <ProposalPdfBody
              project={pdfTarget.project}
              quote={pdfTarget.quote}
              qualities={remote?.qualities || []}
              issuer={user}
              chamberBannerName={remote?.chamber?.chamberName}
            />
          </div>
        )}
      </div>

      <TopBar
        title="Teklifler"
        subtitle="Duruma göre filtreleyin — sözleşme yalnızca onayladığınız satırlarda"
      />
      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "active", label: "Aktif teklifler" },
            { id: "inactive", label: "Pasif teklifler" },
            { id: "contracted", label: "Sözleşmeler" }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              className={`yk-chip text-xs font-semibold transition ${
                filterId === f.id
                  ? "bg-ink-900 text-white border-ink-900"
                  : "bg-surface-100 text-ink-600 border border-ink-100 hover:border-ink-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="yk-input-shell">
          <Search size={18} className="text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Proje, müşteri veya teklif no…"
            className="w-full bg-transparent outline-none text-ink-900 placeholder:text-ink-400 text-sm"
          />
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="Kayıt yok"
            description={
              "Bu filtrede teklif yok."
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map(({ project, quote }) => {
              const calc = calculateQuoteTotals(quote, remote?.qualities || []);
              const wf = quoteWorkflow(quote);
              return (
                <Card key={`${project.id}-${quote.id}`} padded={false} interactive>
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                      <Receipt size={18} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-ink-900 truncate">
                          {project.projectName}
                        </h3>
                        <Badge variant="dark">Teklif #{quote.number}</Badge>
                        <Badge variant="brand">{formatDate(quote.date)}</Badge>
                        <Badge variant="accent">{WORKFLOW_LABELS[wf] || wf}</Badge>
                      </div>
                      <p className="text-xs text-ink-500 truncate">{project.customerName || "—"}</p>
                      <p className="text-lg yk-display text-ink-900 mt-1 tabular-nums">
                        {formatCurrency(calc.totals.dealerGrandTotal)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={FileDown}
                        disabled={pdfBusy}
                        onClick={() => setPdfTarget({ project, quote })}
                      >
                        PDF
                      </Button>
                      <IconButton
                        icon={ArrowRight}
                        variant="dark"
                        ariaLabel="Aç"
                        disabled={user?.role === "system_admin"}
                        title={
                          user?.role === "system_admin"
                            ? "Teklif düzenleme yetkiniz yok"
                            : undefined
                        }
                        onClick={() => {
                          if (user?.role === "system_admin") {
                            toast.warning("Teklif düzenleme yalnızca mobilyacı hesapları içindir.");
                            return;
                          }
                          onOpenContract?.(quote.id, quote.id);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
