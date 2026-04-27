import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Tüm sayısal alanların temeli. Kasıtlı olarak HER ZAMAN type="text" kullanır;
 * tarayıcı number spinner'ları ve caret zıplaması yaşanmaz.
 *
 * Props:
 *  - value           : controlled değer (string veya number)
 *  - onChange(next)  : kullanıcı yazdıkça çağrılır (raw string ile)
 *  - onBlur(value)   : focus kaybında çağrılır (sanitize/parse'lı string ile)
 *  - sanitize(text)  : her keypress sonrası uygulanan dönüşüm
 *  - format(value)   : blur'da uygulanan görünüm formatı
 *  - prefix / suffix : input içine asılan slotlar
 *  - inputMode       : "decimal" | "numeric" | "text" — varsayılan "decimal"
 */
export const SmartTextInput = React.forwardRef(function SmartTextInput(
  {
    value,
    onChange,
    onBlur,
    onFocus,
    sanitize,
    format,
    prefix,
    suffix,
    placeholder,
    inputMode = "decimal",
    autoComplete = "off",
    className,
    inputClassName,
    disabled,
    name,
    id,
    type,
    "aria-label": ariaLabel,
    selectOnFocus = false,
    ...rest
  },
  forwardedRef
) {
  // type="number" KESİNLİKLE engellenir; spinner ve caret zıplamasına neden olur.
  const safeType = type === "password" ? "password" : "text";
  const internalRef = useRef(null);
  const ref = forwardedRef || internalRef;
  const [focused, setFocused] = useState(false);

  // Caret koruması: state güncellemesinden sonra önceki konuma geri dön.
  const caretRef = useRef(null);

  useEffect(() => {
    if (caretRef.current === null) return;
    const node = ref.current;
    if (!node) return;
    try {
      node.setSelectionRange(caretRef.current, caretRef.current);
    } catch {
      /* setSelectionRange bazı tarayıcılarda type !== text/textarea ise hata verir */
    }
    caretRef.current = null;
  });

  function handleChange(e) {
    const node = e.target;
    const raw = node.value;
    const start = node.selectionStart ?? raw.length;

    const sanitized = typeof sanitize === "function" ? sanitize(raw) : raw;

    // Sanitize farklı uzunluktaysa caret farkını telafi et
    const lengthDiff = sanitized.length - raw.length;
    caretRef.current = Math.max(0, start + lengthDiff);

    onChange?.(sanitized, e);
  }

  function handleBlur(e) {
    setFocused(false);
    const formatted =
      typeof format === "function" ? format(e.target.value) : e.target.value;
    onBlur?.(formatted, e);
  }

  function handleFocus(e) {
    setFocused(true);
    if (selectOnFocus) {
      requestAnimationFrame(() => {
        try {
          e.target.select();
        } catch {
          /* noop */
        }
      });
    }
    onFocus?.(e);
  }

  return (
    <div
      className={clsx(
        "yk-input-shell",
        focused && "border-brand-500 ring-4 ring-brand-100",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      {prefix && <span className="text-ink-500 text-sm">{prefix}</span>}
      <input
        {...rest}
        ref={ref}
        id={id}
        name={name}
        type={safeType}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={clsx(
          "w-full bg-transparent outline-none text-ink-900 placeholder:text-ink-400 text-base",
          "tabular-nums",
          inputClassName
        )}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
      {suffix && <span className="text-ink-500 text-sm font-medium">{suffix}</span>}
    </div>
  );
});

export default SmartTextInput;
