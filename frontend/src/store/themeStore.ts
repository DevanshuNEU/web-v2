import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Wallpaper {
  id: string;
  name: string;
  type: "static" | "gradient" | "animated";
  theme: "light" | "dark" | "both";
  thumbnail?: string;
  imageUrl?: string;
  gradientConfig?: {
    colors: string[];
    angle: number;
  };
  animatedConfig?: {
    colors: string[];
    speed: number;
    pattern: "mesh" | "radial" | "wave";
  };
}

interface ThemeStore {
  // State
  mode: "light" | "dark";
  accentColor: string;
  wallpaper: Wallpaper | null;
  wallpaperTint: string | null;

  // Actions
  toggleMode: () => void;
  setMode: (mode: "light" | "dark") => void;
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

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      // Initial state
      mode: "light",
      accentColor: ACCENT_COLORS.blue,
      wallpaper: {
        id: "light-mountains",
        name: "Mountain Vista",
        type: "static",
        theme: "light",
        imageUrl: "/wallpapers/light-mountainVista.png",
      },
      wallpaperTint: null,

      // Actions
      toggleMode: () =>
        set((state) => {
          const newMode = state.mode === "light" ? "dark" : "light";
          // Auto-switch wallpaper when theme changes
          const defaultWallpaper =
            newMode === "dark"
              ? {
                  id: "dark-mountain",
                  name: "Mountain Night",
                  type: "static" as const,
                  theme: "dark" as const,
                  imageUrl: "/wallpapers/dark-mountainNight.png",
                }
              : {
                  id: "light-mountains",
                  name: "Mountain Vista",
                  type: "static" as const,
                  theme: "light" as const,
                  imageUrl: "/wallpapers/light-mountainVista.png",
                };
          return {
            mode: newMode,
            wallpaper: defaultWallpaper,
          };
        }),

      setMode: (mode) => {
        const defaultWallpaper =
          mode === "light"
            ? {
                id: "dark-mountain",
                name: "Mountain Night",
                type: "static" as const,
                theme: "dark" as const,
                imageUrl: "/wallpapers/dark-mountainNight.png",
              }
            : {
                id: "light-mountains",
                name: "Mountain Vista",
                type: "static" as const,
                theme: "light" as const,
                imageUrl: "/wallpapers/light-mountainVista.png",
              };
        set({ mode, wallpaper: defaultWallpaper });
      },

      setAccent: (color) => set({ accentColor: color }),

      setWallpaper: (wallpaper) => set({ wallpaper }),

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
    accentColor: store.accentColor,
    wallpaper: store.wallpaper,
    wallpaperTint: store.wallpaperTint,
    toggleMode: store.toggleMode,
    setMode: store.setMode,
    setAccent: store.setAccent,
    setWallpaper: store.setWallpaper,
    setWallpaperTint: store.setWallpaperTint,
  };
};
