/** Copy for /products (B2B game aggregation). Client-supplied text, verbatim. */
export const products = {
  meta: {
    title: "Products",
    description:
      "Agentium provides a scalable, multi-tenant B2B game aggregation platform connecting independent game providers through a unified technology infrastructure.",
    path: "/products",
  },
  hero: {
    eyebrow: "01 // PRODUCTS",
    title: "B2B Game Aggregation Infrastructure",
    sub: "Agentium provides a scalable, multi-tenant B2B game aggregation platform connecting independent game providers through a unified technology infrastructure. Designed for licensed iGaming operators, it simplifies integration, centralizes management and supports AI-agent-compatible gaming experiences through secure APIs, live data processing and financial-system connectivity.",
  },
  aggregation: {
    eyebrow: "01.1 // GAME_AGGREGATION",
    title: "A Unified Game Aggregation Platform for the Agentic iGaming Economy",
    features: [
      { key: "api", title: "Unified Game API", body: "Standardized integration across independent gaming providers." },
      { key: "catalogue", title: "Centralized Game Catalogue", body: "Operator access, categories, availability and game versions." },
      { key: "session", title: "Session Management", body: "Consistent player and authorized AI-agent sessions." },
      { key: "wallet", title: "Wallet & Settlement", body: "Connectivity for wager authorization and settlement." },
      { key: "agent", title: "AI Agent Compatibility", body: "Structured game states and action interfaces for compatible agents." },
      { key: "analytics", title: "Analytics & Monetization", body: "Game events, performance reporting and usage-based B2B billing." },
    ],
  },
  portfolio: {
    eyebrow: "01.2 // GAMING_PORTFOLIO",
    title: "Multi-Category Gaming Portfolio",
    tagline: "One Platform. Multiple Gaming Categories. Unified Integration.",
    body: "Agentium’s aggregation layer is designed to support classic, card, casino-style, instant-play, arcade and themed games through one integration ecosystem, giving licensed operators a flexible foundation for diverse gaming experiences and compatible autonomous AI agents.",
    gamesLabel: "GAMES",
    categories: [
      { key: "board", title: "Classic & Board Games", games: ["Ludo", "Snake & Ladder", "Ultimate Tic Tac Toe", "Domino Duel"] },
      { key: "cards", title: "Card & Poker Games", games: ["Blackjack", "Three Card Poker", "Rummy", "Hi-Lo"] },
      { key: "roulette", title: "Roulette & Table Games", games: ["American Roulette", "European Roulette", "Mafia Roulette", "IN-OUT"] },
      { key: "instant", title: "Dice, Prediction & Instant", games: ["Crash", "Limbo", "Dice", "Mines", "Plinko", "Coin Flip", "Wheel"] },
      { key: "arcade", title: "Arcade, Casual & Skill", games: ["8-Ball Pool", "Rabbit 9X", "Alice Bob Charlie", "Drill"] },
      { key: "slots", title: "Slots, Gems & Themed", games: ["Classic Fruits", "Gem Rush", "Slot Gems", "Jade Dynasty", "Crystal Miner", "Fortune Phoenix"] },
    ],
  },
} as const;

export type ProductFeatureKey = (typeof products.aggregation.features)[number]["key"];
export type ProductCategoryKey = (typeof products.portfolio.categories)[number]["key"];
