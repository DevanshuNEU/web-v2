import React from "react";
import { opinions } from "@/data/aboutMe";

/**
 * OpinionsSection - "Things I'll argue about", promoted to the top of About.
 *
 * The best writing on the page, so it gets the serif at a reading size, one
 * line per opinion, hairline-divided. Same `opinions` list the terminal
 * `opinions` command and the concierge read.
 */

export function OpinionsSection() {
  return (
    <ul className="flex flex-col">
      {opinions.map((line) => (
        <li
          key={line}
          className="about-opinion font-display text-text py-4 border-b border-border last:border-b-0 first:pt-0"
        >
          {line}
        </li>
      ))}
    </ul>
  );
}
