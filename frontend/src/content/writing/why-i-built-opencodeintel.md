In the fall of 2025 I was writing code in Claude Desktop, and it kept making things up about my repo.

It answered with total confidence about code it had never read. The model wasn't dumb. It just had no way to look anything up, so it guessed, and the guesses read exactly like answers.

If the model could look up the right code instead of guessing, it would stop making things up about my repo. That was the whole idea at the start.

## The same problem, with people

The second push came from people. I saw it during onboarding at a company, and again when friends wanted to contribute to my repos. They didn't know where anything was, and I couldn't walk each of them through it every time.

A new teammate and a language model are in the same spot on day one. Neither knows the codebase. The teammate asks the author, which doesn't scale. The model guesses, which is worse.

So the bet became: give an AI the same map of a codebase you'd give a new teammate.

## I wasn't first, and that was fine

None of this was new in November 2025. Cursor had indexed codebases since 2023. Greptile, which is how I found this space, launched in March 2024 and said in its own launch post that it was "far from the first" to try RAG on a codebase. MCP had been public for a year, and other people were already shipping code search servers on it.

I wanted to build something in the AI space, and this was the problem I actually had. MCP was the way in: Claude Desktop, the tool that kept guessing, could call an MCP server and get real answers about my code.

## Four days in December

I made the first commit on November 21, 2025, right as the fall semester ended. It already had the shape: tree-sitter split Python and JavaScript into function-level chunks, OpenAI embeddings went into Pinecone, and an MCP server let an agent search them. Dependency graphs and impact analysis were in there too.

Then winter break gave me four days, December 18 to 21, to find out whether any of it worked. I ran it over 14 open-source codebases and logged every day, including the days it went wrong.

Two things from those four days still matter to me.

First, a reranker made search worse before it made it better, and I'd recorded the wrong lesson in between. I wrote that one up separately: [Rerankers made my code search worse](https://www.devanshuchicholikar.com/writing/rerankers-code-search).

Second, describing code in English beat embedding the code itself. Across seven codebases in my ablation, searching LLM-written summaries of each function found the right one first 84.1% of the time, against 78.1% for raw code embeddings. Greptile had published the same finding: a query scores 0.8152 against an English description of some code and 0.7280 against the code itself. My data and theirs pointed the same way, and the data is [public](https://github.com/OpenCodeIntel/retrieval-research).

## Then the semester

From January to April it got squeezed in around classes and a TA job. The search v2 code started on January 4 and v3 on January 26. By now the repo has 726 commits, and OpenCodeIntel is a web app, a REST API and a 12-tool MCP server: search, dependency graphs, impact analysis and more.

## What production taught me

The number that surprised me most came from production, not the research.

On the 10-query eval for the production search pipeline, the reranker pulls one more right file into the top 10. Recall goes from 0.80 to 0.85. It also pushes some correct first answers down, and MRR, the score for getting the right answer at the top, drops from 0.80 to 0.66.

I'd spent December watching a reranker add 8.4 points. In production it helped a little and hurt the thing I cared about most. Same idea, different reranker, different data, different result.

## What I learned later

I didn't know this when I started, but Claude Code had gone the other way. Its creator, Boris Cherny, wrote in February 2026: "Early versions of Claude Code used RAG + a local vector db, but we found pretty quickly that agentic search generally works better."

He might be right for Claude Code. The public evidence is still split. Cursor reported 12.5% higher accuracy on average when its agent had semantic search, against an agent limited to tools like grep, and independent papers this year range from a big win for retrieval to no effect at all. I don't have a benchmark that settles it, and I'd be suspicious of anyone who says they do.

## Would I change anything?

Honestly, no. There are much better agentic workflows now, and I'd design the platform differently with them. But I built it with what existed then, around a full semester, and I measured it honestly, including the parts that didn't work.

If your coding agent keeps making things up about your repo, give it something to look up.
