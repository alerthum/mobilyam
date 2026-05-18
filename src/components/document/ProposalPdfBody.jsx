import React from "react";
import { calculateQuoteTotals } from "../../utils/calculations.js";
import {
  WORKFLOW_LABELS,
  isContractPdfTitle,
  pdfDocumentHeading,
  quoteWorkflow
} from "../../constants/quoteWorkflow.js";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format.js";
import { getRoomDefinition } from "../../config/rooms.js";
import primaryBrandLogoUrl from "../../assets/ushak-mobar-logo.png";
import chamberSealLogoUrl from "../../assets/ushak-marango-esnaf-odasi-logo.png";

/**
 * PDF görünümü: yalnızca yk-pdf-* sınıfları + data-yk-pdf stil bloğu (hex/rgb).
 * böylece html2canvas Tailwind oklch yüzünden kırılmaz; çıktı tasarımlı kalır.
 */
const PDF_EMBEDDED_CSS = `
[data-yk-print-root].yk-pdf {
  box-sizing: border-box;
  max-width: 210mm;
  margin: 0 auto;
  background: #ffffff;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 11px;
  line-height: 1.45;
  color: #0f172a;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.yk-pdf * { box-sizing: border-box; }
.yk-pdf-bar {
  height: 6px;
  width: 100%;
}
.yk-pdf--quote .yk-pdf-bar {
  background: linear-gradient(90deg, #0284c7 0%, #0369a1 45%, #0f172a 100%);
}
.yk-pdf--contract .yk-pdf-bar {
  background: linear-gradient(90deg, #9f1239 0%, #1e3a8a 48%, #0f172a 100%);
}
.yk-pdf-inner { padding: 28px 32px 32px 32px; }
.yk-pdf-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}
.yk-pdf-brand { display: flex; align-items: flex-start; gap: 12px; min-width: 0; flex: 1; }
.yk-pdf-logo {
  height: 40px;
  width: auto;
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}
.yk-pdf-header-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.yk-pdf-chamber-seal {
  height: 46px;
  width: 46px;
  display: block;
  object-fit: contain;
  flex-shrink: 0;
}
.yk-pdf-chamber-line {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 6px 0;
}
.yk-pdf-doc-title-main {
  display: block;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: #0f172a;
  margin: 0;
}
.yk-pdf--quote .yk-pdf-doc-title-main { color: #0c4a6e; }
.yk-pdf--contract .yk-pdf-doc-title-main { color: #334155; }
.yk-pdf-doc-title-sub {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
.yk-pdf-meta {
  flex-shrink: 0;
  min-width: 124px;
  padding: 8px 11px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  text-align: left;
}
.yk-pdf-meta-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 4px 0;
}
.yk-pdf-meta-num {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.yk-pdf-meta-date { font-size: 9px; color: #64748b; margin: 5px 0 0 0; }
.yk-pdf-meta-status { font-size: 9px; font-weight: 600; color: #475569; margin: 6px 0 0 0; }

.yk-pdf-project { margin-top: 14px; }
.yk-pdf-project-name {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 3px 0;
}
.yk-pdf-project-code {
  font-size: 11px;
  color: #64748b;
  margin: 0;
}
.yk-pdf-project-code-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 11px;
  color: #64748b;
  flex-wrap: wrap;
  margin: 0;
}
.yk-pdf-project-code-row > span:first-child {
  min-width: 0;
}
.yk-pdf-project-code-num {
  flex-shrink: 0;
  font-weight: 700;
  color: #334155;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.yk-pdf-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.yk-pdf-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
  min-width: 0;
}
.yk-pdf--contract .yk-pdf-card.yk-pdf-card--issuer {
  border-color: #cbd5e1;
  background: #f8fafc;
}
.yk-pdf--quote .yk-pdf-card.yk-pdf-card--issuer-accent {
  border-color: #bae6fd;
  background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 70%);
}
.yk-pdf-card-title {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}
.yk-pdf-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 10px;
  align-items: start;
}
.yk-pdf-field { margin-bottom: 0; }
.yk-pdf-field-l {
  font-size: 9px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 1px 0;
}
.yk-pdf-field-v {
  font-size: 10px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.35;
  word-break: break-word;
}
.yk-pdf-field--sm .yk-pdf-field-l { font-size: 8px; }
.yk-pdf-field--sm .yk-pdf-field-v { font-size: 9.5px; line-height: 1.3; }
.yk-pdf-field--full { grid-column: 1 / -1; }
  margin: 26px 0 14px 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
}
.yk-pdf-empty {
  padding: 20px;
  text-align: center;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #94a3b8;
}

.yk-pdf-table-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.yk-pdf-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.yk-pdf-table thead tr {
  color: #ffffff;
  text-align: left;
}
.yk-pdf--quote .yk-pdf-table thead tr { background: #0e7490; }
.yk-pdf--contract .yk-pdf-table thead tr { background: #1e293b; }
.yk-pdf-table th {
  padding: 9px 8px;
  font-weight: 600;
}
.yk-pdf-table th.yk-pdf-n { text-align: right; }
.yk-pdf-table td {
  padding: 7px 8px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}
.yk-pdf-table tbody tr:nth-child(even) { background: #f8fafc; }
.yk-pdf-table tbody tr:nth-child(odd) { background: #ffffff; }
.yk-pdf-table td.yk-pdf-n { text-align: right; font-variant-numeric: tabular-nums; }
.yk-pdf-td-strong { font-weight: 700; color: #0f172a; }
.yk-pdf-money { font-weight: 700; color: #047857; }

.yk-pdf-fin {
  margin-top: 22px;
  padding: 18px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(165deg, #ffffff 0%, #f0f9ff 100%);
}
.yk-pdf--contract .yk-pdf-fin {
  background: linear-gradient(165deg, #ffffff 0%, #f1f5f9 100%);
  border-color: #cbd5e1;
}
.yk-pdf-fin-title {
  margin: 0 0 14px 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
}
.yk-pdf-fin-cols {
  display: flex;
  flex-direction: row;
  gap: 20px;
  flex-wrap: wrap;
}
.yk-pdf-fin-col { flex: 1 1 220px; }
.yk-pdf-fin-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 11px;
}
.yk-pdf-fin-row span:first-child { color: #475569; }
.yk-pdf-fin-row span:last-child { font-weight: 700; font-variant-numeric: tabular-nums; color: #0f172a; }
.yk-pdf-fin-divider {
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
  margin-top: 6px;
}
.yk-pdf-fin-disc { color: #b91c1c !important; }
.yk-pdf-fin-netline {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #cbd5e1;
}
.yk-pdf-fin-netline span:first-child { font-weight: 700; color: #334155; }
.yk-pdf-fin-netline span:last-child { font-weight: 800; font-size: 12px; color: #0f172a; }
/* Yalnızca genel toplam — kompakt vurgulu kart */
.yk-pdf-net {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  color: #ffffff;
}
.yk-pdf--quote .yk-pdf-net { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); }
.yk-pdf--contract .yk-pdf-net { background: linear-gradient(135deg, #334155 0%, #1e293b 100%); }
.yk-pdf-net-l { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; opacity: 0.92; }
.yk-pdf-net-v { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.yk-pdf-fin-note { margin: 8px 0 0 0; font-size: 9px; color: #64748b; line-height: 1.4; }

.yk-pdf-pay {
  margin-top: 22px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  page-break-inside: avoid;
}
.yk-pdf--contract .yk-pdf-pay {
  border-color: #94a3b8;
  background: linear-gradient(180deg, #fafafa 0%, #ffffff 28%);
}
.yk-pdf-pay-title {
  margin: 0 0 6px 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #475569;
}
.yk-pdf-pay-intro {
  margin: 0 0 14px 0;
  font-size: 9px;
  color: #64748b;
  line-height: 1.45;
}
.yk-pdf-pay-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.yk-pdf-pay-table th {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid #1e293b;
  font-weight: 700;
  color: #334155;
  font-size: 9px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.yk-pdf-pay-table td {
  padding: 12px 10px 14px 10px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}
.yk-pdf-pay-strong { font-weight: 700; color: #0f172a; white-space: nowrap; }
.yk-pdf-pay-blank {
  display: block;
  min-height: 22px;
  border-bottom: 1px dotted #64748b;
  margin-top: 4px;
}
.yk-pdf-pay-cc-detail { padding-left: 0 !important; }
.yk-pdf-pay-cc-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 14px;
  align-items: end;
  margin-top: 6px;
  font-size: 9px;
  color: #475569;
}
.yk-pdf-pay-cc-grid span:nth-child(odd) { font-weight: 600; white-space: nowrap; }
.yk-pdf-pay-blank-short {
  display: block;
  min-height: 18px;
  border-bottom: 1px dotted #64748b;
}

.yk-pdf-sign {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #cbd5e1;
  display: flex;
  flex-direction: row;
  gap: 28px;
  flex-wrap: wrap;
  page-break-inside: avoid;
}
.yk-pdf-sign-col {
  flex: 1 1 42%;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}
.yk-pdf-sign-title {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}
.yk-pdf-sign-sub {
  margin: 8px 0 0 0;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  min-height: 18px;
}
.yk-pdf-sign-stamp {
  margin-top: 36px;
  font-size: 9px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.yk-pdf-sign-line {
  margin-top: 8px;
  border-bottom: 1px solid #1e293b;
  min-height: 1px;
}
.yk-pdf-sign-hint {
  margin: 8px 0 0 0;
  font-size: 8.5px;
  color: #94a3b8;
}

.yk-pdf-legal {
  margin-top: 22px;
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid #94a3b8;
  background: #f8fafc;
  page-break-inside: avoid;
}
.yk-pdf-legal-title {
  margin: 0 0 12px 0;
  font-size: 11px;
  font-weight: 800;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.yk-pdf-legal ol {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  font-size: 9.5px;
  line-height: 1.5;
}
.yk-pdf-legal li { margin-bottom: 8px; }
.yk-pdf-legal li:last-child { margin-bottom: 0; }

.yk-pdf-tr-sub td {
  background: #f8fafc;
  font-size: 10px;
  color: #475569;
  border-top: none;
}
.yk-pdf-tr-sub .yk-pdf-money { color: #0f172a; font-weight: 700; }

.yk-pdf-footer {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 8.5px;
  line-height: 1.55;
  color: #94a3b8;
}
.yk-pdf-footer strong { color: #64748b; font-weight: 600; }
`;

function Field({ label, value, fullWidth = false }) {
  return (
    <div className={`yk-pdf-field${fullWidth ? " yk-pdf-field--full" : ""}`}>
      <p className="yk-pdf-field-l">{label}</p>
      <p className="yk-pdf-field-v">{value || "—"}</p>
    </div>
  );
}

export default function ProposalPdfBody({
  project,
  quote,
  qualities,
  issuer,
  chamberBannerName,
  countertopCatalog = []
}) {
  if (!quote || !project) return null;
  const wf = quoteWorkflow(quote);
  const docTitle = pdfDocumentHeading(quote);
  const isContract = isContractPdfTitle(wf);
  const calc = calculateQuoteTotals(quote, qualities || [], countertopCatalog || []);
  const qualById = new Map((qualities || []).map((q) => [q.id, q]));

  const skinClass = isContract ? "yk-pdf yk-pdf--contract" : "yk-pdf yk-pdf--quote";
  const issuerCardClass = isContract
    ? "yk-pdf-card yk-pdf-card--issuer"
    : "yk-pdf-card yk-pdf-card--issuer-accent";

  const subtitle = docTitle === "Sözleşme" ? "Ticari taahhüt dökümanı" : null;

  return (
    <div
      className={skinClass}
      data-yk-print-root
      data-yk-print-skin
    >
      <style data-yk-pdf="1" dangerouslySetInnerHTML={{ __html: PDF_EMBEDDED_CSS }} />

      <div className="yk-pdf-bar" aria-hidden />

      <div className="yk-pdf-inner">
        <header className="yk-pdf-header">
          <div className="yk-pdf-brand">
            <img className="yk-pdf-logo" src={primaryBrandLogoUrl} alt="" />
            <div>
              <p className="yk-pdf-chamber-line">{chamberBannerName || "Oda birliği"}</p>
              <h1 className="yk-pdf-doc-title">
                <span className="yk-pdf-doc-title-main">{docTitle}</span>
                {subtitle ? (
                  <span className="yk-pdf-doc-title-sub">{subtitle}</span>
                ) : null}
              </h1>
            </div>
          </div>
          <div className="yk-pdf-header-right">
            <img className="yk-pdf-chamber-seal" src={chamberSealLogoUrl} alt="" />
            {!isContract ? (
              <div className="yk-pdf-meta">
                <p className="yk-pdf-meta-label">Belge</p>
                <p className="yk-pdf-meta-num">#{quote.number}</p>
                <p className="yk-pdf-meta-date">{formatDate(quote.date)}</p>
                <p className="yk-pdf-meta-status">{WORKFLOW_LABELS[wf] || wf}</p>
              </div>
            ) : null}
          </div>
        </header>

        <div className="yk-pdf-project">
          <h2 className="yk-pdf-project-name">{project.projectName || "Proje"}</h2>
          {isContract ? (
            <div className="yk-pdf-project-code-row">
              <span>
                {project.contractCode
                  ? `Sözleşme / proje kodu: ${project.contractCode}`
                  : "Sözleşme / proje kodu: —"}
              </span>
              <span className="yk-pdf-project-code-num">
                #{quote.number} · {formatDate(quote.contractedAt || quote.date)}
              </span>
            </div>
          ) : project.contractCode ? (
            <p className="yk-pdf-project-code">
              Sözleşme / proje kodu: {project.contractCode}
            </p>
          ) : null}
        </div>

        <div className="yk-pdf-cards">
          <div className={`yk-pdf-card ${issuerCardClass}`}>
            <p className="yk-pdf-card-title">Sunan firma (üretici)</p>
            <div className="yk-pdf-card-grid">
              <Field label="Firma" value={issuer?.company} fullWidth />
              <Field label="Yetkili" value={issuer?.fullName} />
              <Field label="Telefon" value={issuer?.phone} />
              <Field label="Adres" value={issuer?.addressLine} fullWidth />
              <Field
                label="İl / ilçe"
                value={[issuer?.cityProvince, issuer?.district].filter(Boolean).join(" / ")}
              />
              <Field
                label="Vergi dairesi / no"
                value={[issuer?.taxOffice, issuer?.taxNumber].filter(Boolean).join(" · ")}
              />
            </div>
          </div>
          <div className="yk-pdf-card">
            <p className="yk-pdf-card-title">Müşteri</p>
            <div className="yk-pdf-card-grid">
              <Field label="Unvan / Ad" value={project.customerName} fullWidth />
              <Field label="Telefon" value={project.customerPhone} />
              <Field label="Adres" value={project.projectAddress} fullWidth />
            </div>
          </div>
        </div>

        <section>
          <h3 className="yk-pdf-section-title">Oda satırları</h3>
          {(quote.rooms || []).length === 0 ? (
            <div className="yk-pdf-empty">Henüz modül satırı eklenmemiş.</div>
          ) : (
            <div className="yk-pdf-table-wrap">
              <table className="yk-pdf-table">
                <thead>
                  <tr>
                    <th>Oda</th>
                    <th>Tip</th>
                    <th>Kalite</th>
                    <th className="yk-pdf-n">Panel m²</th>
                    <th className="yk-pdf-n">m² fiyat</th>
                    <th className="yk-pdf-n">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.rooms.map(({ room, price }) => {
                    const def = getRoomDefinition(room.type);
                    const qn =
                      qualById.get(room.selectedQualityId)?.name || price.qualityName;
                    const sqm = price.officialSqmPrice;
                    const isKitchen = room.type === "mutfak" || room.type === "kitchen";
                    const showTezgah =
                      isKitchen &&
                      (price.countertopTotal > 0 ||
                        price.countertopMtul > 0 ||
                        Boolean(price.countertopName));
                    return (
                      <React.Fragment key={room.id}>
                        <tr>
                          <td className="yk-pdf-td-strong">{room.name || def.label}</td>
                          <td>{def.label}</td>
                          <td>{qn}</td>
                          <td className="yk-pdf-n">
                            {price.panelEquivalentM2.toLocaleString("tr-TR", {
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="yk-pdf-n">{formatCurrency(sqm)}</td>
                          <td className="yk-pdf-n yk-pdf-money">{formatCurrency(price.baseOfficial)}</td>
                        </tr>
                        {showTezgah ? (
                          <tr className="yk-pdf-tr-sub">
                            <td className="yk-pdf-td-strong" style={{ paddingLeft: "14px" }}>
                              {room.name || def.label}
                            </td>
                            <td>Tezgah</td>
                            <td>{price.countertopName || "—"}</td>
                            <td className="yk-pdf-n">
                              {price.countertopMtul > 0
                                ? formatNumber(price.countertopMtul, " mtül")
                                : "—"}
                            </td>
                            <td className="yk-pdf-n">{formatCurrency(price.countertopUnitPrice)}</td>
                            <td className="yk-pdf-n yk-pdf-money">
                              {formatCurrency(price.countertopTotal)}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="yk-pdf-fin">
          <h3 className="yk-pdf-fin-title">Finansal özet</h3>
          <div className="yk-pdf-fin-cols">
            <div className="yk-pdf-fin-col">
              <div className="yk-pdf-fin-row">
                <span>m² × kalite toplamı</span>
                <span>{formatCurrency(calc.totals.officialRoomTotal)}</span>
              </div>
              {calc.totals.countertopExtrasTotal > 0 ? (
                <div className="yk-pdf-fin-row">
                  <span>Tezgah (mutfak, mtül × birim)</span>
                  <span>{formatCurrency(calc.totals.countertopExtrasTotal)}</span>
                </div>
              ) : null}
              <div className="yk-pdf-fin-row">
                <span>Cam</span>
                <span>{formatCurrency(calc.totals.glassExtrasTotal)}</span>
              </div>
              <div className="yk-pdf-fin-row">
                <span>Ek hırdavat</span>
                <span>{formatCurrency(calc.totals.hardwareExtrasTotal)}</span>
              </div>
              <div className="yk-pdf-fin-row">
                <span>Ek hizmetler</span>
                <span>{formatCurrency(calc.totals.servicesTotal)}</span>
              </div>
            </div>
            <div className="yk-pdf-fin-col">
              <div className="yk-pdf-fin-row yk-pdf-fin-divider">
                <span>Brüt (indirimsiz)</span>
                <span>{formatCurrency(calc.totals.officialGrandTotal)}</span>
              </div>
              <div className="yk-pdf-fin-row yk-pdf-fin-disc">
                <span>İndirimler</span>
                <span>−{formatCurrency(calc.totals.totalDiscount)}</span>
              </div>
              <div className="yk-pdf-fin-row yk-pdf-fin-netline">
                <span>Net tutar (KDV hariç)</span>
                <span>{formatCurrency(calc.totals.dealerGrandTotal)}</span>
              </div>
              {calc.totals.vatIncluded ? (
                <>
                  <div className="yk-pdf-fin-row">
                    <span>KDV ({calc.totals.vatRate}%)</span>
                    <span>{formatCurrency(calc.totals.vatAmount)}</span>
                  </div>
                  <div className="yk-pdf-net">
                    <span className="yk-pdf-net-l">GENEL TOPLAM</span>
                    <span className="yk-pdf-net-v">{formatCurrency(calc.totals.grandTotalWithVat)}</span>
                  </div>
                  <p className="yk-pdf-fin-note">Net tutar + KDV tutarı = genel toplam.</p>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {isContract ? (
          <section className="yk-pdf-pay">
            <h4 className="yk-pdf-pay-title">Müşteri ödeme şekilleri</h4>
            <p className="yk-pdf-pay-intro">
              Ödeme planı el yazısı veya fatura ekinde netleştirilir. Boş satırlar müşteri ve firma
              yetkilisi tarafından imza öncesi doldurulur.
            </p>
            <table className="yk-pdf-pay-table">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Ödeme şekli</th>
                  <th style={{ width: "22%" }}>Tutar</th>
                  <th>Detay / not</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="yk-pdf-pay-strong">Peşin</td>
                  <td>
                    <span className="yk-pdf-pay-blank" aria-hidden />
                  </td>
                  <td>
                    <span className="yk-pdf-pay-blank" aria-hidden />
                  </td>
                </tr>
                <tr>
                  <td className="yk-pdf-pay-strong">Havale / EFT</td>
                  <td>
                    <span className="yk-pdf-pay-blank" aria-hidden />
                  </td>
                  <td>
                    <span className="yk-pdf-pay-blank" aria-hidden />
                  </td>
                </tr>
                <tr>
                  <td className="yk-pdf-pay-strong">Kredi kartı (taksit)</td>
                  <td>
                    <span className="yk-pdf-pay-blank" aria-hidden />
                  </td>
                  <td className="yk-pdf-pay-cc-detail">
                    <div className="yk-pdf-pay-cc-grid">
                      <span>Taksit sayısı</span>
                      <span className="yk-pdf-pay-blank-short" aria-hidden />
                      <span>İlk taksit tarihi</span>
                      <span className="yk-pdf-pay-blank-short" aria-hidden />
                      <span>Son taksit tarihi</span>
                      <span className="yk-pdf-pay-blank-short" aria-hidden />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="yk-pdf-pay-strong">Diğer</td>
                  <td colSpan={2}>
                    <span className="yk-pdf-pay-blank" aria-hidden />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {isContract ? (
          <section className="yk-pdf-legal">
            <h4 className="yk-pdf-legal-title">Hukuki bilgilendirme ve şartlar</h4>
            <ol>
              <li>
                İşbu belge, ürün ve hizmet kalemleri ile fiyatların özetini oluşturur; teslimat süreleri,
                ödeme vadeleri, montaj kapsamı, garanti süreleri ve ayıplı sorumluluk nihai olarak
                taraflarca imzalanan yazılı sözleşme ve teknik şartnamede düzenlenir.
              </li>
              <li>
                Burada gösterilen KDV satırları bilgilendirme amaçlıdır; kesin vergi matrahı ve beyan
                yükümlülükleri yürürlükteki mevzuat ve düzenlenen belgelere tabidir.
              </li>
              <li>
                Montaj, nakliye, ölçüm ve sözleşme dışı ek işler ayrıca yazılı olarak fiyatlandırılır;
                sözlü vaatler bağlayıcı sayılmaz.
              </li>
              <li>
                Oda / birlik katalog fiyatları ile uyum, üreticinin beyanına dayanır; birlik tarafından
                yayımlanan resmi fiyat ve şartlar geçerlidir.
              </li>
              <li>
                Uyuşmazlıklarda taraflar öncelikle yazılı müzakere yoluyla çözüm arar; kanuni merciler
                saklıdır.
              </li>
            </ol>
          </section>
        ) : null}

        {isContract ? (
          <section className="yk-pdf-sign">
            <div className="yk-pdf-sign-col">
              <p className="yk-pdf-sign-title">Firma</p>
              <p className="yk-pdf-sign-sub">{issuer?.company || "—"}</p>
              <div className="yk-pdf-sign-stamp">Kaşe ve imza</div>
              <div className="yk-pdf-sign-line" aria-hidden />
              <p className="yk-pdf-sign-hint">Yetkili adı soyadı · görevi</p>
            </div>
            <div className="yk-pdf-sign-col">
              <p className="yk-pdf-sign-title">Müşteri</p>
              <p className="yk-pdf-sign-sub">{project.customerName || "Ad soyad / ünvan"}</p>
              <div className="yk-pdf-sign-stamp">İmza</div>
              <div className="yk-pdf-sign-line" aria-hidden />
              <p className="yk-pdf-sign-hint">Tarih · … / … / …</p>
            </div>
          </section>
        ) : null}

        <footer className="yk-pdf-footer">
          <p>
            {isContract ? (
              <>
                <strong>Sözleşme özeti.</strong> İmza veya onay öncesi şartları okuyunuz.
                Kesin hükümler imzalanan sözleşmede yer alır.
              </>
            ) : (
              <>
                <strong>Bilgilendirme belgesi.</strong> Bu çıktı fiyatlandırma özetidir; bağlayıcı sözleşme
                metni ayrıca düzenlenir.
              </>
            )}
          </p>
          <p style={{ marginTop: "8px" }}>
            {(chamberBannerName ? `${chamberBannerName} · ` : "")}
            {issuer?.company || ""}
          </p>
        </footer>
      </div>

      <div className="yk-pdf-bar" aria-hidden />
    </div>
  );
}
