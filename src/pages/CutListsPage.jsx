import React, { useMemo } from "react";
import { Scissors, ArrowRight, Search } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { formatDate } from "../utils/format.js";
import { quoteWorkflow, WORKFLOW_LABELS } from "../constants/quoteWorkflow.js";
import CutListPanel from "../components/quote/CutListPanel.jsx";

export default function CutListsPage({ onOpenQuote }) {
  const { remote } = useApp();
  const user = useCurrentUser();
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState(null);

  const rows = useMemo(() => {
    const quotes = (remote?.quotes || []).filter((q) => q.ownerUserId === user?.id);
    const qLower = query.trim().toLocaleLowerCase("tr");
    return quotes
      .map((quote) => ({
        quote,
        items: Array.isArray(quote.cutLists) ? quote.cutLists : []
      }))
      .filter((row) => row.items.length > 0)
      .filter(({ quote }) => {
        if (!qLower) return true;
        const hay = [quote.projectName, quote.customerName, String(quote.number)]
          .join(" ")
          .toLocaleLowerCase("tr");
        return hay.includes(qLower);
      })
      .sort((a, b) => (b.quote.date || "").localeCompare(a.quote.date || ""));
  }, [remote?.quotes, user?.id, query]);

  const totalFiles = rows.reduce((sum, r) => sum + r.items.length, 0);

  return (
    <div className="min-h-full">
      <TopBar
        title="Kesim Listeleri"
        subtitle={`${totalFiles} dosya · 30 gün otomatik saklama`}
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Teklif no, proje veya müşteri ara…"
            className="yk-input w-full pl-9"
          />
        </div>

        {!rows.length ? (
          <EmptyState
            icon={Scissors}
            title="Kesim listesi bulunamadı"
            description="Teklif detayından PDF veya resim yüklediğinizde burada listelenir."
          />
        ) : (
          rows.map(({ quote, items }) => {
            const wf = quoteWorkflow(quote);
            const open = expandedId === quote.id;
            return (
              <Card key={quote.id} className="overflow-hidden">
                <div className="w-full p-4 flex items-start gap-3">
                  <button
                    type="button"
                    className="flex flex-1 min-w-0 items-start gap-3 text-left rounded-xl hover:bg-surface-50 transition -m-1 p-1"
                    onClick={() => setExpandedId(open ? null : quote.id)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Scissors size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink-900 truncate">{quote.projectName}</p>
                        <Badge tone="neutral">#{quote.number}</Badge>
                        <Badge tone="soft">{WORKFLOW_LABELS[wf] || "Teklif"}</Badge>
                      </div>
                      <p className="text-xs text-ink-500 mt-1">
                        {quote.customerName || "Müşteri belirtilmedi"} · {formatDate(quote.date)} ·{" "}
                        {items.length} dosya
                      </p>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={ArrowRight}
                    className="shrink-0"
                    onClick={() => onOpenQuote?.(quote.id)}
                  >
                    Teklife git
                  </Button>
                </div>
                {open ? (
                  <div className="border-t border-ink-100 px-4 pb-4 pt-2">
                    <CutListPanel quoteId={quote.id} items={items} compact />
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
