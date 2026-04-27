import React from "react";
import DecimalInput from "./DecimalInput.jsx";

export default function MoneyInput({ value, onValueChange, ...rest }) {
  return (
    <DecimalInput
      value={value}
      onValueChange={onValueChange}
      suffix="₺"
      placeholder="0"
      {...rest}
    />
  );
}
