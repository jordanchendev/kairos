import { create } from "zustand";
import { persist } from "zustand/middleware";

const MARKET_OPTIONS = ["All Markets", "TW Equities", "US Equities", "Crypto Perps"] as const;
const TIME_RANGE_OPTIONS = ["1D", "1W", "1M", "1Q", "YTD"] as const;

export type MarketOption = (typeof MARKET_OPTIONS)[number];
export type TimeRangeOption = (typeof TIME_RANGE_OPTIONS)[number];

type UiState = {
  commandPaletteOpen: boolean;
  selectedMarket: MarketOption;
  selectedTimeRange: TimeRangeOption;
  sidebarCollapsed: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setSelectedMarket: (market: MarketOption) => void;
  setSelectedTimeRange: (range: TimeRangeOption) => void;
  toggleSidebar: () => void;
};

export const marketOptions = [...MARKET_OPTIONS];
export const timeRangeOptions = [...TIME_RANGE_OPTIONS];

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      selectedMarket: "All Markets",
      selectedTimeRange: "1W",
      sidebarCollapsed: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSelectedMarket: (market) => set({ selectedMarket: market }),
      setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: "kairos-store",
      partialize: (state) => ({
        selectedMarket: state.selectedMarket,
        selectedTimeRange: state.selectedTimeRange,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
