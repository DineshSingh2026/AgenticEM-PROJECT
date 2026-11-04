/** Line icons for the 07.1 token-economy tiles, in the order of copy.home.settlement.economy.models. */
const PATHS: React.ReactNode[] = [
  // 0 · Game-engine usage fees: controller
  <>
    <path d="M6.5 7h11a4 4 0 0 1 3.9 4.9l-.8 3.5a2.2 2.2 0 0 1-3.9.8L15 14H9l-1.7 2.2a2.2 2.2 0 0 1-3.9-.8l-.8-3.5A4 4 0 0 1 6.5 7Z" />
    <path d="M7.5 9.5v3M6 11h3" />
    <circle cx="16" cy="10" r=".7" fill="currentColor" />
    <circle cx="17.9" cy="11.9" r=".7" fill="currentColor" />
  </>,
  // 1 · API consumption metering: gauge with code brackets
  <>
    <path d="M3.5 16a8.5 8.5 0 0 1 17 0" />
    <path d="M12 16l4-5" />
    <circle cx="12" cy="16" r="1.2" />
    <path d="M6 8.5l.9.9M18 8.5l-.9.9M12 6v1.2" />
    <path d="M8 20.5l-1.5-1.25L8 18M16 18l1.5 1.25L16 20.5" />
  </>,
  // 2 · AI inference token accounting: chip with token core
  <>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 10.6v2.8M10.9 12h2.2" />
    <path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" />
  </>,
  // 3 · Analytics subscriptions: bars with a rising trend line
  <>
    <path d="M3.5 20.5h17" />
    <path d="M6 20.5v-4M10 20.5v-6M14 20.5v-3.5M18 20.5v-7" />
    <path d="M4.5 11.5 9 7l4 3 6.5-6.5" />
    <path d="M15.5 3.5h4v4" />
  </>,
  // 4 · Enterprise agreements: contract with seal
  <>
    <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h6" />
    <path d="M14 3l4.5 4.5V11" />
    <path d="M14 3v4.5h4.5" />
    <path d="M8.5 10.5h6M8.5 13.5h4" />
    <circle cx="17.5" cy="16.5" r="2.5" />
    <path d="M16.3 18.7 15.5 21.5l2-1 2 1-.8-2.8" />
  </>,
  // 5 · Revenue-sharing models: split pie
  <>
    <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12Z" />
    <path d="M14.5 2.5v7h7a7 7 0 0 0-7-7Z" />
  </>,
];

export function MonetizationIcon({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[index % PATHS.length]}
    </svg>
  );
}
