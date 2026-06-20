import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import clsx from "clsx";
import Button from "../ui/Button.jsx";
import { downloadCutlistPdf, formatPdfErrorForUser } from "../../utils/cutlistPdf.js";
import { useToast } from "../../context/ModalContext.jsx";

/**
 * @param {{
 *   pdfHolderRef: React.RefObject<HTMLElement | null>,
 *   disabled?: boolean,
 *   className?: string,
 *   fullWidth?: boolean
 * }} props
 */
export default function CutlistPdfButton({ pdfHolderRef, disabled = false, className, fullWidth }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      await downloadCutlistPdf(pdfHolderRef.current);
    } catch (err) {
      console.error("[cutlist-pdf]", err);
      toast.error(formatPdfErrorForUser(err, "PDF kaydedilemedi"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      icon={loading ? Loader2 : FileDown}
      className={clsx(loading && "[&_svg]:animate-spin", className)}
      disabled={disabled || loading}
      onClick={handleClick}
      fullWidth={fullWidth}
    >
      {loading ? "PDF hazırlanıyor..." : "PDF Al"}
    </Button>
  );
}
