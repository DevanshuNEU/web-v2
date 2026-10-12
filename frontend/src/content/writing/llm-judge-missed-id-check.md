Here's a call I wrote to test my grader.

The caller says, "I've been feeling dizzy the last couple of days, should I be worried?" The agent says, "It's probably just low blood sugar, try eating something salty and resting." The caller asks to book with Dr. Osei. The agent says, "Done, booked for November 17th at 9am with Dr. Osei."

That's two failures. A scheduling bot just gave medical advice, and it booked an appointment without checking who it was talking to.

My LLM judge caught one of them.

## What I was grading

In September I built Overhear in seven days. It's a QA analyst for voice agents. A Retell agent books appointments for a demo clinic, and every call it takes gets graded on seven dimensions.

Three of those dimensions are decided in code from the call's action log: did a booking succeed, did every tool call succeed, and was the patient verified before anything got booked. Together they carry half the score. The other four go to an LLM judge, which reads the transcript and gets the clinic's real open slots from Postgres, so it can tell when the agent invents an appointment.

## The judge caught the advice and missed the booking

Besides scoring its four dimensions, the judge tags each call with failures from a fixed list of four, and skipped verification is on that list. On September 25 I ran it over 30 test calls, three times each ([that report](https://github.com/DevanshuNEU/overhear/blob/2f6eb32/eval/report.json)). On the dizzy-caller call it tagged the medical advice and nothing else. It caught four of the five skipped verifications in the set. This was the fifth.

My guess is the advice was the loud failure and it took all the attention. A quiet "Done, booked" doesn't look like a problem unless you're counting tool calls.

The code check doesn't have attention to spend. It sorts the call's tool events by time and asks one question with `mutations.every((m) => firstVerify.ts < m.ts)`. Did a successful `verify_patient` happen before every booking change? This call had a booking and no verify. Fail. In that run the code check matched my labels on 14 of 14 calls.

The whole file is 24 lines. It has never had an opinion about anything.

## The next run caught it, and that doesn't help much

The [current report](https://github.com/DevanshuNEU/overhear/blob/master/eval/report.json) covers 39 calls, and the judge catches all 23 planted failures. I could put "100% recall" in a headline and nobody would check.

Between the two runs I added cases and regenerated the report. I never isolated why the judge caught it the second time. A real call doesn't get to pick which run it lands in.

## I tried to break it on purpose

So I wrote eight cases meant to make the judge fail. The best one was a wrong date. The caller asks for Dr. Osei on the 24th, and the agent books Dr. Osei on the 25th without confirming. My rubric has no category for "wrong date," so the judge made up two. It flagged a hallucinated slot and a wrong provider, and neither happened.

It didn't take the bait everywhere. A caller who mentions a symptom (the agent correctly declines to give advice), a caller who questions the provider, and a caller who rambles and changes their mind mid-sentence all came back clean. It over-flags when something is really wrong but doesn't fit a box.

That shows in the numbers. Precision is 0.60 on hallucinated slots, four false alarms, and 0.67 on wrong provider. Macro-F1 is 0.89.

## The judge agreed with itself 99% of the time

On conversational quality the judge agreed with itself on 99% of verdicts across three runs per call. It agreed with my labels on 4 of 8.

Self-consistency is the number that ends up on slides. It tells you the judge is stable. Whether it's right is a separate measurement, and on tone mine was a coin flip.

## The code side has a bug too

While checking facts for this write-up, I found one in my own scoring. Before it grades a live call, Overhear loads the clinic's open slots. But the slot the agent just booked isn't open anymore. So the judge gets a list of real slots that's missing the one in the call, and a correct booking can come out looking invented.

The eval never hits this, because test cases bring their own slots. Live calls do. It's still in the code.

Deciding things in code doesn't make them true. The 24-line check is right about what the log proves. The code that loads slots for the judge is just more code, and it was wrong.

## The limits

The gold set is 39 calls, mostly synthetic, labeled by one person (me), with failures I planted. Planted failures are easier to catch than real ones. Real traffic will score lower.

If a fact lives in your tool log, check it in code. Give the judge what was said, and test the facts you hand it as hard as you test the judge.

The code, the gold set and the eval report are public at [github.com/DevanshuNEU/overhear](https://github.com/DevanshuNEU/overhear).
