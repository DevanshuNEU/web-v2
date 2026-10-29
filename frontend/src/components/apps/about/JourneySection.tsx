import React from "react";

/**
 * JourneySection - five beats, typeset as a plain editorial column.
 *
 * The long childhood story (Rohan, Digit, Encarta, Delux Paint) sits behind a
 * native <details> disclosure ("Read the long version"), so the default read
 * stays short and the full story is one click away. Keyboard and screen
 * reader support come with the element; .about-details styles the summary.
 */

function Beat({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3">
      <h3 className="editorial-head text-text">{title}</h3>
      {children}
    </li>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-lg text-text-secondary leading-relaxed">{children}</p>;
}

function LongPart({
  title,
  date,
  children,
}: {
  title: string;
  date?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {date && <p className="font-mono-meta">{date}</p>}
      <h4 className="font-display text-text text-xl leading-tight">{title}</h4>
      <p className="text-base text-text-secondary leading-relaxed">{children}</p>
    </div>
  );
}

export function JourneySection() {
  return (
    <div className="flex flex-col gap-10 max-w-[68ch]">
      <ol className="flex flex-col gap-10">
        <Beat title="Google. Just... Google.">
          <P>
            I was 8 when dad brought home our first laptop. Obviously, I went
            straight for the games. But Google caught my attention too: this
            thing had answers to{" "}
            <em className="emphasis-underline not-italic">literally everything</em>.
            That&apos;s when it hit me: computers weren&apos;t just for playing
            games. They were something way bigger.
          </P>

          <details className="about-details">
            <summary className="about-focus">Read the long version</summary>
            <div className="flex flex-col gap-6 pt-5">
              <LongPart title="My friend Rohan had internet" date="~2005">
                His mom would definitely scold us if she caught us gaming, so
                we&apos;d wait until she wasn&apos;t around. CoolROMs, GBA
                emulator, Vice City, Prince of Persia, Aladdin: every game was
                a new world to explore. Every discovery made me want to dig
                deeper.
              </LongPart>
              <LongPart title="Every Friday: Digit magazine day">
                A new Digit magazine would show up with a CD full of software
                and games. Weekends became my exploration time: install every
                single thing on that CD to see what works, share CDs with
                friends (before cloud storage was even a thing), break things,
                fix them, learn something new.
              </LongPart>
              <LongPart title="Then I discovered Microsoft Encarta">
                Hours would just disappear. Science, history, world wars,
                mythology, animal facts: I&apos;d just click through topic after
                topic. Learning became addictive in the best way possible.
              </LongPart>
              <LongPart title="Delux Paint and Ice Cream Sandwich">
                I&apos;d make digital paintings in Delux Paint and show them to my
                grandfather. The way his face would light up made every creation
                worth it. Then came dad&apos;s Garmin touchscreen phone, my first
                time using Android. I was hooked from day one.
              </LongPart>
            </div>
          </details>
        </Beat>

        <Beat
          title={
            <>
              10th standard.{" "}
              <code className="font-mono text-[0.7em] text-text-secondary">
                printf(&quot;Hello World&quot;)
              </code>
            </>
          }
        >
          <P>
            My first C program. I remember thinking it was the coolest thing
            ever. Then I discovered for loops and started making all these
            different patterns. That&apos;s when I knew: I wanted to be a
            software engineer.
          </P>
        </Beat>

        <Beat title="My first “real” project took 2 months">
          <P>
            A database management system for a library. Simple concept, right?
            Wrong. So many errors, OOP concepts I didn&apos;t really understand
            yet, failed attempts everywhere. Slowly, slowly, things started
            working. Biggest lesson: stay calm. Most errors are just silly
            mistakes, and patience wins over frustration every single time.
          </P>
          <P>
            React did the same to me. &ldquo;Why React when we literally have
            HTML, CSS, and JavaScript?&rdquo; was me for like 3 months straight,
            until components finally clicked. The confusion is always part of
            learning: you push through it, and suddenly you&apos;ve unlocked a
            whole new set of capabilities.
          </P>
        </Beat>

        <Beat title="Then came real jobs">
          <P>
            An internship at Pitney Bowes, then two years full-time at Jaksh
            Enterprise building a Java / Spring Boot quotation platform:
            optimizing APIs for actual customers, talking to the client
            directly, sometimes choosing &ldquo;good enough&rdquo; over
            &ldquo;perfect&rdquo; because shipping matters.
          </P>
          <P>
            Requirements arrived by phone call. Nobody wrote tickets. Best
            training for forward deployed work I could have asked for.
          </P>
        </Beat>

        <Beat title="Being a TA">
          <P>
            TA&apos;d Network Structures &amp; Cloud Computing (CSYE6225) for
            100+ grad students across two semesters: grading, office hours, and
            debugging their AWS infrastructure at 11 PM. Nothing tests whether
            you actually understand something like teaching it.
          </P>
          <P>
            When someone was stuck for hours and their code finally worked, that
            feeling was different. Worth it.
          </P>
        </Beat>
      </ol>

      <p className="text-lg text-text leading-relaxed">
        Same kid, same curiosity. Now it&apos;s pointed at the MCP layer, the most
        interesting layer I&apos;ve found yet.
      </p>
    </div>
  );
}
