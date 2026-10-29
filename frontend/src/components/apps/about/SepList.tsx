import React from "react";

/**
 * SepList - an inline run of items with one separator between them.
 *
 * Every item carries its own leading middot, and the list is pulled left by
 * one separator width inside an overflow-hidden wrapper, so the dot that
 * would start each wrapped line is clipped. Net effect: separators only ever
 * sit BETWEEN items, never at a line start or end. See .about-seplist.
 */

export function SepList({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={`about-seplist ${className ?? ""}`}>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
