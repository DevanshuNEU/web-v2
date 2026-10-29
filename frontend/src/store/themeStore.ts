import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Wallpaper {
  id: string;
  name: string;
  type: "static" | "gradient" | "animated";
  theme: "light" | "dark" | "both";
  thumbnail?: string;
  /** A still of an animated wallpaper, used only for its Preferences thumbnail. */
  previewUrl?: string;
  imageUrl?: string;
  gradientConfig?: {
    colors: string[];
    angle: number;
  };
  animatedConfig?: {
    colors: string[];
    speed: number;
    pattern: "mesh" | "radial" | "wave" | "particles" | "starfield" | "grid";
  };
}

export type Palette = "mono" | "color";

interface ThemeStore {
  // State
  mode: "light" | "dark";
  palette: Palette;
  accentColor: string;
  wallpaper: Wallpaper | null;
  /** The wallpaper last picked for each theme, restored when the theme switches back. */
  wallpaperByMode: Partial<Record<"light" | "dark", Wallpaper>>;
  wallpaperTint: string | null;

  // Actions
  toggleMode: () => void;
  setMode: (mode: "light" | "dark") => void;
  setPalette: (palette: Palette) => void;
  setAccent: (color: string) => void;
  setWallpaper: (wallpaper: Wallpaper) => void;
  setWallpaperTint: (color: string) => void;
}

// Default wallpapers
export const DEFAULT_WALLPAPERS: Wallpaper[] = [
  {
    id: "gradient-mesh-light",
    name: "Gradient Flow",
    type: "animated",
    theme: "light",
    animatedConfig: {
      colors: ["#667eea", "#764ba2", "#f093fb"],
      speed: 15,
      pattern: "mesh",
    },
  },
  {
    id: "gradient-mesh-dark",
    name: "Dark Matter",
    type: "animated",
    theme: "dark",
    animatedConfig: {
      colors: ["#0f2027", "#203a43", "#2c5364"],
      speed: 20,
      pattern: "mesh",
    },
  },
];

// Preset accent colors (iOS-style)
export const ACCENT_COLORS = {
  blue: "#007AFF",
  purple: "#AF52DE",
  pink: "#FF2D55",
  orange: "#FF9500",
  green: "#34C759",
  teal: "#5AC8FA",
  red: "#FF3B30",
};

/** The wallpaper each theme shows until the visitor picks one. */
const DEFAULT_WALLPAPER_BY_MODE: Record<"light" | "dark", Wallpaper> = {
  dark: {
    id: "dark-signal-grid",
    name: "Signal Grid",
    type: "animated",
    theme: "dark",
    thumbnail: "linear-gradient(135deg,#07091a 0%,#1a0a2e 50%,#0a1a1f 100%)",
    previewUrl: "/wallpapers/previews/dark-signal-grid.jpg",
    animatedConfig: { colors: ["#f97316", "#06b6d4", "#8b5cf6"], speed: 1, pattern: "grid" },
  },
  light: {
    id: "light-mountains",
    name: "Mountain Vista",
    type: "static",
    theme: "light",
    imageUrl: "/wallpapers/light-mountainVista.png",
    thumbnail: "/wallpapers/light-mountainVista.png",
  },
};

export function defaultWallpaperFor(mode: "light" | "dark"): Wallpaper {
  return DEFAULT_WALLPAPER_BY_MODE[mode];
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: "dark",
      // Premium black & white is the default; "Fun" (color) is opt-in.
      palette: "mono",
      accentColor: ACCENT_COLORS.blue,
      wallpaper: DEFAULT_WALLPAPER_BY_MODE.dark,
      wallpaperByMode: {},
      wallpaperTint: null,

      // Actions
      toggleMode: () => get().setMode(get().mode === "light" ? "dark" : "light"),

      // Switching theme restores the wallpaper the visitor last picked for
      // that theme, and falls back to the theme default only if they never
      // picked one. The outgoing wallpaper is remembered first, so visitors
      // whose choice predates wallpaperByMode keep it too.
      setMode: (mode) =>
        set((state) => {
          const remembered = { ...state.wallpaperByMode };
          if (state.wallpaper && state.wallpaper.theme === state.mode) {
            remembered[state.mode] = state.wallpaper;
          }
          return {
            mode,
            wallpaperByMode: remembered,
            wallpaper: remembered[mode] ?? defaultWallpaperFor(mode),
          };
        }),

      setPalette: (palette) => set({ palette }),

      setAccent: (color) => set({ accentColor: color }),

      setWallpaper: (wallpaper) =>
        set((state) => ({
          wallpaper,
          wallpaperByMode:
            wallpaper.theme === "light" || wallpaper.theme === "dark"
              ? { ...state.wallpaperByMode, [wallpaper.theme]: wallpaper }
              : state.wallpaperByMode,
        })),

      setWallpaperTint: (color) => set({ wallpaperTint: color }),
    }),
    {
      name: "portfolio-os-theme", // localStorage key
    }
  )
);

// Hook for easier access
export const useTheme = () => {
  const store = useThemeStore();
  return {
    mode: store.mode,
    palette: store.palette,
    accentColor: store.accentColor,
    wallpaper: store.wallpaper,
    wallpaperTint: store.wallpaperTint,
    toggleMode: store.toggleMode,
    setMode: store.setMode,
    setPalette: store.setPalette,
    setAccent: store.setAccent,
    setWallpaper: store.setWallpaper,
    setWallpaperTint: store.setWallpaperTint,
  };
};
