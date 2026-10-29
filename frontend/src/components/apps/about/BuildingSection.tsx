import React from "react";
import { Hairline } from "@/components/editorial";
import { SepList } from "./SepList";
import {
  building, buildingIntro, currentlyMastering, readingList, portfolioTechStack,
} from "@/data/aboutMe";

/**
 * BuildingSection - the ONE place About describes the projects, then what
 * I'm learning. Rows are hairline-divided; the name column sits beside the
 * text in a wide window and above it in a narrow one (.about-row).
 */

function Row({
  name,
  level: Heading,
  children,
}: {
  name: string;
  level: "h3" | "h4";
  children: React.ReactNode;
}) {
  return (
    <div className="about-row py-4">
      <Heading className="font-display text-text text-xl leading-tight">{name}</Heading>
      <div className="flex flex-col gap-2 text-base text-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function BuildingSection() {
  return (
    <div className="flex flex-col gap-10 max-w-[68ch]">
      <div className="flex flex-col gap-4">
        {buildingIntro.map((para) => (
          <p key={para} className="text-lg text-text-secondary leading-relaxed">
            {para}
          </p>
        ))}
      </div>

      <div className="flex flex-col">
        <Hairline />
        {building.map((item) => (
          <React.Fragment key={item.name}>
            <Row name={item.name} level="h3">
              <p>{item.text}</p>
              {item.name === "Portfolio OS" && (
                <SepList items={portfolioTechStack} className="font-mono text-sm text-text" />
              )}
            </Row>
            <Hairline />
          </React.Fragment>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="editorial-head text-text">Learning</h3>
        <p className="text-lg text-text-secondary leading-relaxed">
          Working with Claude and MCPs changed how I learn: it&apos;s a thinking
          partner for reviewing code, explaining concepts and debugging.
        </p>
        <div className="flex flex-col">
          <Hairline />
          {currentlyMastering.map((item) => (
            <React.Fragment key={item.name}>
              <Row name={item.name} level="h4">
                <p>{item.detail}</p>
              </Row>
              <Hairline />
            </React.Fragment>
          ))}
        </div>
        <p className="text-base text-text-secondary leading-relaxed">
          On the reading list: {readingList.join(", ")}.
        </p>
      </section>
    </div>
  );
}
