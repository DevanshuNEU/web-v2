On December 18, 2025, I put a reranker on top of my code search and the number went down.

The search is for OpenCodeIntel. You type "listen for state changes" and it should hand back the function that does that. My test bed was Zustand, a small React state library, with 21 queries. The first stage blended three signals (BM25 keyword matching, embeddings of the code, and embeddings of an LLM-written summary of each function) and put the right function first on 76.2% of queries. Then I sent its top 30 candidates through Voyage's `rerank-2`, a model whose only job is reordering search results.

66.7%.

Two queries got better and four got worse ([the results file](https://github.com/OpenCodeIntel/retrieval-research/blob/main/results/exp04_20251218_173747.json)). "Check if state objects are equal" used to find `shallow`. After reranking it found `compareEntries`, a helper that `shallow` calls. Close enough to be annoying, wrong enough to count. A local BGE reranker did worse, 61.9% to 47.6%, though it ran against a weaker first stage.

## I wrote down the wrong lesson

That evening's results file says it with full confidence: "Cross-encoders don't work for code." Rerankers learn mostly from web text, and code isn't web text. It's a clean theory and it made me feel smart. Option A in my notes was to accept what I had and ship.

I didn't ship. Two days later the same model was the biggest single gain in the system.

## Six things changed at once, so I can't tell you which one mattered

By December 20 the pipeline looked different:

- The first stage switched from a weighted blend to reciprocal rank fusion with equal weights.
- The reranker got the top 10 candidates instead of the top 30.
- It saw each function's name and summary, with no code. On the 18th it got the name, the summary and the first 500 characters of code.
- A new extractor rebuilt the Zustand index, from 112 entries to 33.
- The query set changed, from 21 queries to 32.
- I'd changed the labels. More on that below, because it's the part I'm least proud of.

After that, `rerank-2` never made a codebase worse. Flask went from 60% to 72%, with six queries fixed and none broken. Across 14 codebases in four languages (Python, JavaScript and TypeScript, Java, Go), the average went from 78% to 94%.

My guess is the input. A reranker scoring 30 candidates of half-cut-off code has a lot of noise to read through. I never ran the test that would settle it, so treat that as a guess.

## About those labels

Reading my own log ten months later, this is the section I'd flag in someone else's paper.

On December 18 I audited the queries the system "failed." The log says three expected answers, `clearStorage`, `merge` and `rehydrate`, don't exist in Zustand. They do. I grepped Zustand's source this week. `clearStorage` and `rehydrate` are methods on the persist API, and `merge` is a persist option. My extractor never indexed them, because they sit inside an object instead of standing alone as functions.

Then I "corrected" the labels. Every one of the six corrections added the answer the system had already returned. Hit@1 went from 71.4% to 100% on the same run. Some additions were fair, since "use store in react" really can be answered by `useBoundStore`. But if you add the system's answers to the answer key, you'll get 100% every time. That number measured how agreeable I was.

## The test I trust more

The 94% runs on queries generated from function names. `CreateBatchInBatches` becomes "create batch in batches," which shares most of its words with the answer. It's an open-book exam. The log itself guessed real-world queries would land at 70 to 80%.

So the evidence I'd put weight on is the [ablation from December 21](https://github.com/OpenCodeIntel/retrieval-research/blob/main/RESEARCH_LOG.md), which ran 14 configurations on 7 codebases for 98 runs in all. Four of those codebases used 20 plain-English queries each instead of ones generated from names, like "open database connection" for GORM. I wrote a few of them and had Claude write the rest from my examples, so they're closer to how people search but they aren't an independent benchmark. On those 80 queries, reranking raised the number of right answers at rank 1 from 70 to 77. Across all seven codebases, the full system scored 92.1% with reranking and 83.7% without.

The same table had a result I didn't see coming. Without reranking, summary embeddings alone scored 84.1%, level with the full three-way fusion at 83.7%. With reranking on, the fusion beat the best single retriever on one codebase out of seven. I'd built three retrievers, and one retriever plus a reranker did nearly the same job.

## Then production did its own thing

OpenCodeIntel's production search uses Cohere's `rerank-v3.5`, which the research never tested. On production's 10-query regression set, reranking raises recall@10 from 0.80 to 0.85 and drops MRR from 0.80 to 0.658. It pulls one more right file into the top 10 and pushes some correct first answers down.

So does reranking help code search? On my December harness, by 8.4 points, once everything around it changed. In production today it depends which number you care about.

If you add a reranker and your numbers drop, look at what you're feeding it before you blame the model. Then grep your answer key.

The log with the embarrassing parts left in, the query sets, the summaries and the scripts are all public at [github.com/OpenCodeIntel/retrieval-research](https://github.com/OpenCodeIntel/retrieval-research). The commits are the original December 2025 ones.
