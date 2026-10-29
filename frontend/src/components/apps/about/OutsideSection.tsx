import React from "react";
import { lifeItems } from "@/data/aboutMe";

/**
 * OutsideSection - "Outside code", kept short. Two columns when the window
 * is wide, one when narrow (.about-outside). lifeItems iconNames are not
 * rendered here (kept in data for other surfaces).
 */

export function OutsideSection() {
  return (
    <ul className="about-outside max-w-[68ch]">
      {lifeItems.map((item) => (
        <li key={item.title} className="flex flex-col gap-1">
          <span className="font-display text-text text-xl leading-tight">{item.title}</span>
          <span className="text-base text-text-secondary leading-relaxed">{item.detail}</span>
        </li>
      ))}
    </ul>
  );
}
