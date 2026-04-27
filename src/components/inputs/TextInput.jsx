import React from "react";
import SmartTextInput from "./SmartTextInput.jsx";

/**
 * Düz metin input — type="text", spinner yok.
 */
export default function TextInput({ value, onChange, type, ...rest }) {
  return (
    <SmartTextInput
      value={value ?? ""}
      onChange={(next) => onChange?.(next)}
      inputMode={type === "password" ? "text" : "text"}
      type={type === "password" ? "password" : undefined}
      {...rest}
    />
  );
}
