const crypto = require("crypto");
const { getRemoteState, saveRemoteState } = require("./_db");
const { authenticateRequest, pickChamberBlock } = require("./_auth");
const { sendMail } = require("./_mail");

function clone(v) {
  return JSON.parse(JSON.stringify(v || {}));
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPartnerInviteMail(snap, partner) {
  const producerLine = [
    snap.producerCompany,
    snap.producerName !== snap.producerCompany ? snap.producerName : ""
  ]
    .filter(Boolean)
    .join(" — ");

  const usernameLine = snap.producerUsername
    ? `<tr><td style="padding:8px 0;color:#64748b;width:120px;">Kullanıcı adı</td><td style="padding:8px 0;font-weight:600;">${esc(snap.producerUsername)}</td></tr>`
    : "";

  const contactRows = [
    snap.producerCompany
      ? `<tr><td style="padding:6px 0;color:#64748b;">Firma</td><td style="padding:6px 0;">${esc(snap.producerCompany)}</td></tr>`
      : "",
    snap.producerName
      ? `<tr><td style="padding:6px 0;color:#64748b;">Yetkili</td><td style="padding:6px 0;">${esc(snap.producerName)}</td></tr>`
      : "",
    snap.producerPhone
      ? `<tr><td style="padding:6px 0;color:#64748b;">Telefon</td><td style="padding:6px 0;font-weight:700;color:#0c4a6e;">${esc(snap.producerPhone)}</td></tr>`
      : "",
    snap.producerAddress
      ? `<tr><td style="padding:6px 0;color:#64748b;">Adres</td><td style="padding:6px 0;">${esc(snap.producerAddress)}</td></tr>`
      : "",
    snap.producerCity
      ? `<tr><td style="padding:6px 0;color:#64748b;">İl / ilçe</td><td style="padding:6px 0;">${esc(snap.producerCity)}</td></tr>`
      : ""
  ].join("");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;max-width:560px;line-height:1.55;">
      <p style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;margin:0 0 12px;">
        ${esc(snap.chamberName)}
      </p>
      <p style="font-size:15px;margin:0 0 16px;">Sayın <strong>${esc(partner.company || partner.fullName)}</strong>,</p>
      <p style="font-size:14px;margin:0 0 14px;">
        <strong>${esc(producerLine || snap.producerName || "Mobilyacı üye")}</strong>
        ${snap.producerUsername ? `(<em>kullanıcı adı: ${esc(snap.producerUsername)}</em>)` : ""},
        <strong>#${esc(snap.quoteNumber)}</strong> numaralı
        <strong>«${esc(snap.projectName)}»</strong> sözleşmesine ait işlerde
        toplam <strong style="color:#0369a1;">${esc(snap.totalM2)}</strong> ile sizinle çalışmak istemektedir.
      </p>
      <p style="font-size:14px;margin:0 0 18px;">
        Lütfen <strong>kesim listesi</strong> ve diğer detaylar için
        <strong>${esc(snap.contactLabel)}</strong> ile iletişime geçiniz.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;">
        <p style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">
          İlgili mobilyacı
        </p>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          ${usernameLine}
          ${contactRows}
        </table>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:20px 0 0;">MOBAR 2026 — Resmi teklif sistemi</p>
    </div>`;

  const text = [
    `Sayın ${partner.company || partner.fullName},`,
    "",
    `${producerLine || snap.producerName}${snap.producerUsername ? ` (kullanıcı adı: ${snap.producerUsername})` : ""},`,
    `#${snap.quoteNumber} numaralı «${snap.projectName}» sözleşmesine ait işlerde toplam ${snap.totalM2} ile sizinle çalışmak istemektedir.`,
    "",
    `Kesim listesi ve diğer detaylar için lütfen ${snap.contactLabel} ile iletişime geçiniz.`,
    "",
    "İlgili mobilyacı:",
    snap.producerCompany ? `Firma: ${snap.producerCompany}` : "",
    snap.producerName ? `Yetkili: ${snap.producerName}` : "",
    snap.producerPhone ? `Telefon: ${snap.producerPhone}` : "",
    snap.producerAddress ? `Adres: ${snap.producerAddress}` : "",
    snap.producerCity ? `İl/ilçe: ${snap.producerCity}` : "",
    "",
    snap.chamberName
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
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
    const producerLabel = reportSnapshot.producerCompany || reportSnapshot.producerName || "Mobilyacı";
    const subject = `${producerLabel} — ${reportSnapshot.totalM2 || ""} — #${quote.number} iş birliği`;
    const { html, text } = buildPartnerInviteMail(reportSnapshot, partner);

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
        totalM2: reportSnapshot.totalM2 || "0"
      },
      reportSnapshot: clone(reportSnapshot)
    };

    try {
      await sendMail(smtp, {
        to: partner.email,
        subject,
        html,
        text
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
