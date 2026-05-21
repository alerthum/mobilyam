import React from "react";
import primaryBrandLogoUrl from "../../assets/ushak-mobar-logo.png";
import chamberSealLogoUrl from "../../assets/ushak-marango-esnaf-odasi-logo.png";

const PDF_CSS = `
[data-yk-print-root].yk-pdf-m2 {
  box-sizing: border-box;
  max-width: 210mm;
  margin: 0 auto;
  background: #fff;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 10px;
  line-height: 1.4;
  color: #0f172a;
}
.yk-pdf-m2 * { box-sizing: border-box; }
.yk-pdf-m2-bar { height: 5px; background: linear-gradient(90deg, #9f1239, #1e3a8a 50%, #0f172a); }
.yk-pdf-m2-inner { padding: 22px 26px 26px; }
.yk-pdf-m2-header {
  display: grid;
  grid-template-columns: 2.5cm 1fr 2.5cm;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}
.yk-pdf-m2-logo { width: 2.5cm; height: 2.5cm; object-fit: contain; }
.yk-pdf-m2-logo--r { justify-self: end; }
.yk-pdf-m2-chamber {
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  text-transform: uppercase;
  color: #334155;
  margin: 0 0 4px;
}
.yk-pdf-m2-title { text-align: center; font-size: 18px; font-weight: 700; margin: 0; color: #0f172a; }
.yk-pdf-m2-sub { text-align: center; font-size: 11px; color: #64748b; margin: 6px 0 0; }
.yk-pdf-m2-meta {
  margin: 14px 0;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 10px;
}
.yk-pdf-m2-meta strong { color: #334155; }
.yk-pdf-m2-room {
  margin-top: 14px;
  page-break-inside: avoid;
}
.yk-pdf-m2-room-h {
  font-size: 12px;
  font-weight: 700;
  margin: 0 0 6px;
  padding: 6px 8px;
  background: #f1f5f9;
  border-radius: 6px;
  color: #0f172a;
}
.yk-pdf-m2-table { width: 100%; border-collapse: collapse; font-size: 9px; }
.yk-pdf-m2-table th {
  text-align: left;
  padding: 5px 6px;
  background: #e2e8f0;
  font-weight: 700;
}
.yk-pdf-m2-table td {
  padding: 4px 6px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}
.yk-pdf-m2-table td.num { text-align: right; white-space: nowrap; }
.yk-pdf-m2-foot {
  margin-top: 12px;
  font-size: 9px;
  color: #64748b;
  text-align: center;
}
`;

export default function M2PartnerPdfBody({ report }) {
  if (!report) return null;

  return (
    <div className="yk-pdf-m2" data-yk-print-root data-yk-print-skin>
      <style data-yk-pdf="1" dangerouslySetInnerHTML={{ __html: PDF_CSS }} />
      <div className="yk-pdf-m2-bar" aria-hidden />
      <div className="yk-pdf-m2-inner">
        <header className="yk-pdf-m2-header">
          <img className="yk-pdf-m2-logo" src={primaryBrandLogoUrl} alt="" />
          <div>
            <p className="yk-pdf-m2-chamber">{report.chamberName || "Oda birliği"}</p>
            <h1 className="yk-pdf-m2-title">Sözleşme m² detay raporu</h1>
            <p className="yk-pdf-m2-sub">Fiyat bilgisi içermez</p>
          </div>
          <img className="yk-pdf-m2-logo yk-pdf-m2-logo--r" src={chamberSealLogoUrl} alt="" />
        </header>

        <div className="yk-pdf-m2-meta">
          <p>
            <strong>Proje:</strong> {report.projectName} — #{report.quoteNumber}
          </p>
          <p>
            <strong>Mobilyacı:</strong> {report.producerCompany || report.producerName}
          </p>
          <p>
            <strong>Tarih:</strong> {report.contractDate || report.quoteDate || "—"}
          </p>
          <p>
            <strong>Toplam:</strong> {report.totalM2} ({report.roomCount} oda)
          </p>
        </div>

        {(report.rooms || []).map((room, i) => (
          <section key={i} className="yk-pdf-m2-room">
            <h2 className="yk-pdf-m2-room-h">
              {room.roomLabel} — {room.totalM2}
              {room.qualityName ? ` · Kalite: ${room.qualityName}` : ""}
            </h2>
            <table className="yk-pdf-m2-table">
              <thead>
                <tr>
                  <th>Kalem</th>
                  <th style={{ width: "72px", textAlign: "right" }}>Alan</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {(room.lines || []).length ? (
                  room.lines.map((line, j) => (
                    <tr key={j}>
                      <td>{line.label}</td>
                      <td className="num">{line.m2}</td>
                      <td>{line.detail || line.formula || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}

        <p className="yk-pdf-m2-foot">
          Bu belge yalnızca metrekare detaylarını içerir; fiyat ve KDV bilgisi yer almaz.
        </p>
      </div>
    </div>
  );
}
