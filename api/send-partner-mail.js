const crypto = require("crypto");
const { getRemoteState, saveRemoteState } = require("./_db");
const { authenticateRequest, pickChamberBlock } = require("./_auth");
const { sendMail } = require("./_mail");

function clone(v) {
  return JSON.parse(JSON.stringify(v || {}));
}

function buildHtmlFromSnapshot(report) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const roomBlocks = (report.rooms || [])
    .map((room) => {
      const rows = (room.lines || [])
        .map(
          (line) =>
            `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${esc(line.label)}</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${esc(line.m2)} m²</td>` +
            `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${esc(line.detail || line.formula || "")}</td></tr>`
        )
        .join("");
      return `
        <h3 style="margin:16px 0 8px;font-size:15px;">${esc(room.roomLabel)} — ${esc(room.totalM2)} m²</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:6px 8px;text-align:left;">Kalem</th>
            <th style="padding:6px 8px;text-align:right;">m²</th>
            <th style="padding:6px 8px;text-align:left;">Detay</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="3">—</td></tr>`}</tbody>
        </table>`;
    })
    .join("");

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;max-width:720px;">
      <p style="font-size:12px;color:#64748b;">${esc(report.chamberName)}</p>
      <h1 style="font-size:20px;">${esc(report.projectName)} — #${esc(report.quoteNumber)}</h1>
      <p style="font-size:13px;">
        <strong>Mobilyacı:</strong> ${esc(report.producerCompany || report.producerName)}<br/>
        <strong>Tarih:</strong> ${esc(report.contractDate || report.quoteDate || "")}<br/>
        <strong>Toplam:</strong> ${esc(report.totalM2)} m² (${report.roomCount} oda)
      </p>
      <p style="font-size:12px;color:#64748b;">Yalnızca m² detayları — fiyat bilgisi yoktur.</p>
      ${roomBlocks}
    </div>`;
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
        text: `${subject}\n\nToplam ${outboxItem.summary.totalM2} m² — ${outboxItem.summary.roomCount} oda.`
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
