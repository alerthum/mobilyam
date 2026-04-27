import React, { useMemo } from "react";
import { FileSignature, ArrowRight, Receipt } from "lucide-react";
import TopBar from "../components/layout/TopBar.jsx";
import Card from "../components/ui/Card.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Badge from "../components/ui/Badge.jsx";
import IconButton from "../components/ui/IconButton.jsx";
import { useApp, useCurrentUser } from "../context/AppContext.jsx";
import { calculateQuoteTotals } from "../utils/calculations.js";
import { formatCurrency, formatDate } from "../utils/format.js";

export default function ContractsPage({ onOpenContract }) {
  const { remote } = useApp();
  const user = useCurrentUser();

  const items = useMemo(() => {
    if (!remote) return [];
    const projects =
      user?.role === "producer"
        ? (remote.projects || []).filter((p) => p.ownerUserId === user.id)
        : remote.projects || [];

    const list = [];
    projects.forEach((p) => {
      (p.quotes || []).forEach((q) => {
        list.push({ project: p, quote: q });
      });
    });
    return list.sort((a, b) => (b.quote.date || "").localeCompare(a.quote.date || ""));
  }, [remote, user]);

  return (
    <>
      <TopBar title="Sözleşmeler" subtitle="Tüm teklifler ve sözleşme önizlemesi" />
      <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto space-y-3">
        {items.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="Henüz teklif yok"
            description="İlk projeyi oluşturup teklif eklediğinizde burada listelenecek."
          />
        ) : (
          items.map(({ project, quote }) => {
            const calc = calculateQuoteTotals(quote, remote?.qualities || []);
            return (
              <Card
                key={`${project.id}-${quote.id}`}
                padded={false}
                interactive
              >
                <div className="p-4 sm:p-5 flex items-center gap-3">
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
                    </div>
                    <p className="text-xs text-ink-500 truncate">
                      {project.customerName || "—"}
                    </p>
                    <p className="text-lg yk-display text-ink-900 mt-1 tabular-nums">
                      {formatCurrency(calc.totals.dealerGrandTotal)}
                    </p>
                  </div>
                  <IconButton
                    icon={ArrowRight}
                    variant="dark"
                    ariaLabel="Aç"
                    onClick={() => onOpenContract?.(project.id, quote.id)}
                  />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
