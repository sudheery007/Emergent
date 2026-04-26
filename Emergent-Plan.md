Build a premium, minimal web app that functions as my personal AI-powered stock research desk for U.S. stocks. The app should feel like a high-end research terminal, with a clean white-and-gold design, simple navigation, and fast, structured outputs focused on investment decision-making rather than raw data overload. Reliable data inputs can come from sources such as SEC EDGAR APIs for filings and company facts, combined with market-data and transcript providers for earnings commentary and estimates.

Core product requirements
Stock analysis engine
When the user enters a company or ticker, analyze the stock and return:

Bull case: major growth drivers, strengths, and upside factors.

Bear case: risks, weaknesses, and downside factors.

Key financial ratios such as ROE, ROCE, P/E, leverage, and debt-related metrics.

Summary quarterly results covering the last five years, plus next-year earnings projections.

Key management commentary from the latest earnings call highlights.

Shareholding or ownership changes where data is available.

Red flags such as governance issues, rising leverage, margin deterioration, or declining quality metrics.

A final AI score from 0 to 100, with transparent reasoning behind the score.

Portfolio context
Allow the user to upload a portfolio via CSV and use it as lightweight context:

Detect whether the analyzed stock is already held.

Explain how the stock affects the current portfolio.

If not already held, assess whether it should be considered for addition, with reasoning.

Optionally suggest a simple position size based on portfolio context.

UI and UX requirements
Minimal, premium white-and-gold aesthetic.

Extremely clean interface with strong typography and very low clutter.

Navigation should remain simple: Search, Analysis, Portfolio Context, Settings.

Responses should be sharp, structured, and actionable.

The experience should feel like an intelligent research assistant, not a traditional market dashboard.

Stronger engineering version
Create a production-quality stock research web app for U.S. equities with a premium white-and-gold design language. The app should combine structured financial data, filings, transcript insights, and portfolio context into one streamlined decision-support interface. SEC EDGAR offers company facts and XBRL-based filings access through public APIs, while Finnhub documents an earnings call transcripts API that can support management commentary extraction.

Functional scope
A. Search and analysis
Accept company name or ticker input.

Resolve company identity and fetch core market and financial data.

Build an analysis view that includes:

Bull case.

Bear case.

Core valuation and quality ratios.

Five-year quarterly summary view.

Next-year earnings projection.

Latest earnings call highlights.

Shareholding or ownership trend indicators where available.

Governance and financial red-flag checks.

Final AI score with scoring explanation.

B. Data architecture
Use reliable U.S. stock data sources.

Prefer official or structured sources where possible:

SEC EDGAR company facts and filings for financial facts and disclosure-based signals.

Earnings call transcript APIs for management commentary extraction.

Build a reusable data-service layer so quote data, historicals, filings, transcript analysis, and estimates are modular and replaceable.

Add clear fallback handling for missing data fields.

C. Portfolio context
Support CSV upload for current holdings, and manual entry of holdings.

Parse the uploaded portfolio and use it as contextual input.

Return:

Whether the analyzed stock is already held.

Exposure overlap or diversification impact.

A simple recommendation on whether it complements the current portfolio.

Optional lightweight position-sizing guidance.

D. Decision-first presentation
Prioritize conclusions, reasoning, and material signals.

Avoid cluttered charts or dashboard-style overload unless they directly improve decision quality.

Make every section answer a practical investor question.

Examples of effective stock analysis features for Emergent apps
Effective Emergent stock-analysis apps usually combine structured fundamentals, management commentary, explainable scoring, and portfolio context into a decision-first workflow rather than a data-heavy dashboard. Good feature design also makes it easy to compare narrative claims from earnings calls with actual financial results and filings.

Core analysis
Bull case / bear case summaries that convert raw data into investable arguments, because strong research tools help users move from information to judgment quickly.

Historical fundamentals with standardized ratio panels, such as valuation, profitability, leverage, and cash-flow quality, ideally with multi-year context instead of one-period snapshots.

Earnings-call and filing intelligence, including transcript summaries, guidance changes, management tone shifts, and key disclosure extraction from 10-K, 10-Q, and 8-K filings.

Decision support
Explainable AI score with visible drivers, subscores, and reason codes, since users trust the output more when they can see which factors mattered. Danelfin explicitly emphasizes explainable AI and ranked signal relevance behind its stock scores.

Red-flag detection for dilution, rising debt, margin deterioration, weak guidance, accounting complexity, or governance concerns, because this is often more actionable than adding more ratios.

Watchlists and ranked screeners that show what newly qualifies, what dropped out, and how names rank within a custom list or portfolio. Stock Rover and Quant Investing both highlight watchlist-aware ranking and change detection as useful screener capabilities.

Portfolio context
CSV portfolio upload with overlap, concentration, and fit analysis, so the app can answer “Should I add this?” instead of only “Is this a good stock?”

Correlation or diversification view that shows whether a candidate behaves similarly to current holdings; correlation screening is a practical feature investors already look for in screeners.

Position-sizing guidance based on conviction, diversification impact, and existing exposure, even if the model stays simple and heuristic-driven.

High-value extras
Side-by-side comparison across quarters or peer companies, because investors often want to track narrative and metric changes over time rather than read one document in isolation.

Natural-language search and follow-up chat over transcripts, filings, and metrics, similar to how modern research apps expose AI chat on top of company content.

Saved layouts, custom views, and exportable research notes or watchlists, since advanced users want repeatable workflows and personalized screens.

Strong feature set
A very effective Emergent app feature set would look like this:

Search by ticker or company.

One-page decision memo: bull case, bear case, score, red flags, valuation snapshot.

Five-year financial trend view.

Latest earnings-call highlights and filing changes.

Portfolio fit and correlation check.

Watchlist, rerank, and alerting for score changes or new red flags.

A useful design rule is this: every feature should answer one investor question clearly, such as “What changed?”, “What is the risk?”, “Is management credible?”, or “Does this improve my portfolio?


How to implement AI stock scoring like Danelfin in Emergent apps
To implement Danelfin-style AI stock scoring in an Emergent app, build an explainable multi-factor ranking engine that predicts a stock’s probability of outperforming a benchmark over a defined horizon, then converts that probability into a simple score with visible drivers. Danelfin says its system analyzes large sets of technical, fundamental, and sentiment features, predicts the probability of beating the market over the next three months, and exposes the most relevant signals behind the score.

Core design
Define the target first: for example, “probability this stock beats the S&P 500 over the next 60 trading days,” because Danelfin frames its score around benchmark outperformance over a forward period rather than a vague “good stock” label. Then group your model inputs into a few interpretable buckets such as fundamentals, technicals, sentiment, and risk, since Danelfin publicly describes separate subscores alongside one overall AI score.

A practical factor structure for an Emergent app is:

Fundamentals: valuation, quality, growth, balance-sheet strength.

Technicals: momentum, relative strength, trend stability, volatility.

Sentiment: estimate revisions, earnings-call tone, news tone.

Risk: drawdown, beta, debt risk, earnings instability.

Scoring pipeline
Use a supervised ranking or classification workflow instead of hand-written rules alone. Danelfin describes using recent market learnings, many alpha signals, and ensembles of decision trees to estimate the probability of outperformance, which is then translated into the published AI score.

A good implementation path in Emergent is:

Build a stock-feature table by ticker and date.

Create the label, such as whether the stock outperformed the S&P 500 over the next 60 trading days.

Train a model like gradient boosting or random forest on rolling historical windows.

Output predicted probability of outperformance.

Map that probability to a user-facing score, such as 1 to 10 or 0 to 100.

Explainability
Do not ship a black-box score. Danelfin emphasizes explainable AI, visible subscores, and a ranked list of the most relevant positive and negative signals behind each stock score. In your Emergent app, show:

Overall AI score.

Subscores by factor family.

Top positive drivers.

Top negative drivers.

Benchmark and prediction horizon used.

A useful UI pattern is:

“AI Score: 78/100”

“Chance of beating S&P 500 over next 3 months: 63%”

“Strongest positives: earnings revisions, ROE, 6-month momentum”

“Strongest negatives: valuation stretch, debt trend, volatility”

Emergent implementation
Structure the app into services so the scoring system is modular and maintainable:

Data service for prices, fundamentals, analyst revisions, and transcripts.

Feature-engineering service for ratios, momentum, growth, and sentiment signals.

Model service for prediction and periodic retraining.

Explainability service for feature importance and reason generation.

UI layer for scorecards, factor breakdowns, and comparison views.

If you want a lighter first version, start with a rules-plus-ranking hybrid instead of full ML:

Normalize each factor into percentile ranks.

Weight factor groups, for example quality 30%, momentum 25%, value 20%, growth 15%, risk 10%.

Combine into one score.

Add explanations based on strongest factor contributions. Multi-factor ranking models commonly use weighted factor groups like quality, momentum, value, and low volatility before moving to heavier ML workflows

Build an explainable AI stock scoring engine for my Emergent app inspired by Danelfin-style stock ranking. The system should predict the probability that a stock will outperform the S&P 500 over a defined future period, such as 60 trading days, then convert that probability into a simple user-facing score. The model should combine multiple factor groups including fundamentals, technicals, sentiment, and risk, and it should return an overall score plus separate subscores. Danelfin publicly describes its AI score as a probability-of-outperformance model with explainable signals and subscores, so use that as the design pattern rather than a black-box recommendation engine.

Requirements:

Build a feature pipeline using price, financial, and sentiment inputs.

Create a benchmark-relative prediction target.

Train or simulate a ranking model that outputs outperformance probability.

Convert probability into a clean 0 to 100 score.

Show top positive and negative drivers for each stock.

Include subscores for fundamentals, technicals, sentiment, and risk.

Make the scoring transparent and easy to inspect in the UI.

A sensible MVP is to launch with weighted factor ranks and explanations first, then replace the backend with a trained ensemble model later once you have enough historical feature data and validation results.



# API Keys

## Financial Modeling Prep (Primary)
- **Key:** `n4dwtbELU4YJR1nmhJ4zhY78ih9U5Hz6`
- **Docs:** https://financialmodelingprep.com/developer/docs/
- **Limit:** 250 req/day (free tier)

## Finnhub (Fallback 1)
- **Key:** `d7i3m6hr01qu8vfn8cfgd7i3m6hr01qu8vfn8cg0`
- **Docs:** https://finnhub.io/docs/api
- **Limit:** 60 req/min (free tier)

## Alpha Vantage (Fallback 2)
- **Key:** `Z1AIBZNQZO1L0BUS`
- **Docs:** https://www.alphavantage.co/documentation/
- **Limit:** 25 req/day (free tier)


Financial Statements API: apikey: n4dwtbELU4YJR1nmhJ4zhY78ih9U5Hz6

Finnhub API: d7i3m6hr01qu8vfn8cfgd7i3m6hr01qu8vfn8cg0

Alpha Vantage API: Z1AIBZNQZO1L0BUS