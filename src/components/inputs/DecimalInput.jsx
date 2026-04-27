import React, { useEffect, useState } from "react";
import SmartTextInput from "./SmartTextInput.jsx";
import { parseDecimal, sanitizeDecimalInput, sanitizeIntegerInput } from "../../utils/decimal.js";

/**
 * Ondalık sayı girişi — type="text" inputMode="decimal".
 *  - Yazarken sadece sanitize uygulanır (değer sayıya parse edilmez!)
 *  - Blur'da number'a çevrilir, parent'a number geri verilir.
 *  - Display formatı blur'da uygulanır (bkz. format prop).
 *
 * Props:
 *  - value: number | string — depo değeri
 *  - onValueChange(numberValue) — temiz number döner (blur veya boşluk)
 *  - integer: true ise yalnızca tamsayı kabul eder
 *  - suffix: "cm" / "₺" / "%" gibi
 */
export default function DecimalInput({
  value,
  onValueChange,
  integer = false,
  suffix,
  prefix,
  placeholder = "0",
  selectOnFocus = true,
  className,
  ...rest
}) {
  const [text, setText] = useState(() => valueToText(value, integer));

  useEffect(() => {
    // Dışarıdan gelen değer önemli ölçüde değiştiyse senkron tut
    const numericFromText = parseDecimal(text);
    const numericFromValue = Number(value || 0);
    if (Math.abs(numericFromText - numericFromValue) > 0.0001) {
      setText(valueToText(value, integer));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(next) {
    const sanitized = integer
      ? sanitizeIntegerInput(next)
      : sanitizeDecimalInput(next);
    setText(sanitized);
    // Anında live update istendiğinde number da bildirilir; ama caret riski olmasın diye
    // sayıyı sadece geçerli durumlarda gönder.
    if (sanitized === "" || sanitized === "-") {
      onValueChange?.(0);
      return;
    }
    const parsed = parseDecimal(sanitized);
    if (Number.isFinite(parsed)) onValueChange?.(parsed);
  }

  function handleBlur() {
    const parsed = parseDecimal(text);
    const display = integer
      ? String(Math.round(parsed))
      : prettyDecimal(parsed);
    setText(display);
    onValueChange?.(integer ? Math.round(parsed) : parsed);
  }

  return (
    <SmartTextInput
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      sanitize={integer ? sanitizeIntegerInput : sanitizeDecimalInput}
      placeholder={placeholder}
      suffix={suffix}
      prefix={prefix}
      inputMode={integer ? "numeric" : "decimal"}
      selectOnFocus={selectOnFocus}
      className={className}
      {...rest}
    />
  );
}

function valueToText(value, integer) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (integer) return String(Math.round(n));
  return prettyDecimal(n);
}

function prettyDecimal(n) {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  // Türkçe ondalık için virgül
  return String(n).replace(".", ",");
}
