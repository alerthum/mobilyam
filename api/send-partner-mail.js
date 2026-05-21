const crypto = require("crypto");
const { getRemoteState, saveRemoteState } = require("./_db");
const { authenticateRequest, pickChamberBlock } = require("./_auth");
const { sendMail } = require("./_mail");
const { getMailLogoDataUris } = require("./_m2MailAssets");

function clone(v) {
  return JSON.parse(JSON.stringify(v || {}));
}

function buildHtmlFromSnapshot(report) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const logos = getMailLogoDataUris();
  const headerLogos =
    logos.mobar || logos.chamber
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            ${logos.mobar ? `<td width="80" align="left"><img src="${logos.mobar}" alt="" width="72" height="72" style="display:block;object-fit:contain;"/></td>` : "<td width=\"80\"></td>"}
            <td align="center" style="font-size:13px;font-weight:700;color:#334155;text-transform:uppercase;">${esc(report.chamberName)}</td>
            ${logos.chamber ? `<td width="80" align="right"><img src="${logos.chamber}" alt="" width="72" height="72" style="display:block;object-fit:contain;margin-left:auto;"/></td>` : "<td width=\"80\"></td>"}
          </tr>
        </table>`
      : `<p style="font-size:12px;color:#64748b;text-align:center;">${esc(report.chamberName)}</p>`;

  const roomBlocks = (report.rooms || [])
    .map((room) => {
      const qualityLine = room.qualityName
        ? ` · <span style="color:#475569;">Kalite: ${esc(room.qualityName)}</span>`
        : "";
      const rows = (room.lines || [])
        .map(
          (line) =>
            `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${esc(line.label)}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">${esc(line.m2)}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${esc(line.detail || line.formula || "")}</td></tr>`
        )
        .join("");
      return `
        <h3 style="margin:16px 0 8px;font-size:15px;color:#0f172a;">${esc(room.roomLabel)} — ${esc(room.totalM2)}${qualityLine}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:6px 8px;text-align:left;">Kalem</th>
            <th style="padding:6px 8px;text-align:right;">Alan</th>
            <th style="padding:6px 8px;text-align:left;">Detay</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="3">—</td></tr>`}</tbody>
        </table>`;
    })
    .join("");

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;max-width:720px;">
      ${headerLogos}
      <h1 style="font-size:20px;text-align:center;margin:0 0 8px;">${esc(report.projectName)} — #${esc(report.quoteNumber)}</h1>
      <p style="font-size:13px;text-align:center;">
        <strong>Mobilyacı:</strong> ${esc(report.producerCompany || report.producerName)}<br/>
        <strong>Tarih:</strong> ${esc(report.contractDate || report.quoteDate || "")}<br/>
        <strong>Toplam:</strong> ${esc(report.totalM2)} (${report.roomCount} oda)
      </p>
      <p style="font-size:12px;color:#64748b;text-align:center;">Yalnızca m² detayları — fiyat bilgisi yoktur. Ekte PDF raporu bulunur.</p>
      ${roomBlocks}
    </div>`;
}

function pdfAttachmentFromBody(pdfBase64, quoteNumber, projectName) {
  const raw = String(pdfBase64 || "").trim();
  if (!raw) return [];
  const safeName = String(projectName || "sozlesme")
    .replace(/[^\w\-.ğüşıöçĞÜŞİÖÇ ]+/gu, "")
    .trim()
    .slice(0, 40);
  return [
    {
      filename: `${safeName || "sozlesme"}-m2-${quoteNumber || "rapor"}.pdf`,
      content: raw,
      encoding: "base64",
      contentType: "application/pdf"
    }
  ];
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Yalnızca POST" });
      return;
    }

    const quoteId = String(req.body?.quoteId || "").trim();
    const partnerId = String(req.body?.partnerId || "").trim();
    const reportSnapshot = req.body?.reportSnapshot;
    const pdfBase64 = req.body?.pdfBase64;
    if (!quoteId || !partnerId || !reportSnapshot) {
      res.status(400).json({ error: "quoteId, partnerId ve reportSnapshot zorunludur" });
      return;
    }

    const payload = await getRemoteState();
    const user = authenticateRequest(req, payload.data);
    if (!user || user.role !== "producer") {
      res.status(403).json({ error: "Yalnızca mobilyacı gönderebilir" });
      return;
    }

    const cid = user.chamberId;
    const block = pickChamberBlock(payload.data, cid);
    const partner = (block?.agreedPartners || []).find(
      (p) => p.id === partnerId && p.status !== "passive"
    );
    if (!partner?.email) {
      res.status(400).json({ error: "Anlaşmalı firma bulunamadı veya e-posta yok" });
      return;
    }

    const quote = (payload.data.quotes || []).find(
      (q) => q.id === quoteId && q.ownerUserId === user.id
    );
    if (!quote) {
      res.status(404).json({ error: "Teklif bulunamadı" });
      return;
    }
    if (quote.workflowStatus !== "contracted" && quote.workflowStatus !== "completed") {
      res.status(400).json({ error: "Yalnızca sözleşmeye çevrilmiş teklifler gönderilebilir" });
      return;
    }

    const smtp = block?.smtpSettings;
    const subject = `${reportSnapshot.projectName || "Proje"} — Sözleşme m² detay (#${quote.number})`;
    const html = buildHtmlFromSnapshot(reportSnapshot);

    const outboxItem = {
      id: `MAIL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      chamberId: cid,
      producerUserId: user.id,
      quoteId: quote.id,
      quoteNumber: quote.number,
      projectName: reportSnapshot.projectName || quote.projectName || "",
      partnerId: partner.id,
      partnerName: partner.company || partner.fullName,
      partnerEmail: partner.email,
      sentAt: new Date().toISOString(),
      status: "sent",
      errorMessage: "",
      summary: {
        roomCount: reportSnapshot.roomCount || (reportSnapshot.rooms || []).length,
        totalM2: reportSnapshot.totalM2 || "0"
      },
      reportSnapshot: clone(reportSnapshot)
    };

    try {
      await sendMail(smtp, {
        to: partner.email,
        subject,
        html,
        text: `${subject}\n\nToplam ${outboxItem.summary.totalM2} — ${outboxItem.summary.roomCount} oda.\n\nEkte PDF m² raporu.`,
        attachments: pdfAttachmentFromBody(
          pdfBase64,
          quote.number,
          reportSnapshot.projectName
        )
      });
    } catch (mailErr) {
      outboxItem.status = "failed";
      outboxItem.errorMessage = mailErr.message || "Gönderilemedi";
      const data = clone(payload.data);
      data.partnerMailOutbox = [...(data.partnerMailOutbox || []), outboxItem];
      await saveRemoteState(data);
      res.status(500).json({ error: outboxItem.errorMessage, outboxItem });
      return;
    }

    const data = clone(payload.data);
    data.partnerMailOutbox = [...(data.partnerMailOutbox || []), outboxItem];
    await saveRemoteState(data);

    res.status(200).json({ ok: true, outboxItem });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası", detail: error.message });
  }
};
