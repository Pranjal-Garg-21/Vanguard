/**
 * Stock Market Simulator (arcade): twelve weekly rounds of news, prices and buy / sell / hold choices.
 * Use case: UC-INV-07 · Owner: P4 · Route: /learn/invest/stock-market
 *
 *   StockMarket.tsx   the screen (intro, weekly play, debrief)
 *   MarketTable.tsx, NewsCard.tsx, Debrief.tsx   its parts
 *   logic/            seeded prices, portfolio, debrief analysis (pure, tested)
 *   content           content/scenarios/invest/stock_market.json + content/i18n/en/stockmarket.json
 *
 * Not yet a registered MiniGame: that waits for P2's runner.
 */

export { StockMarket } from './StockMarket';
