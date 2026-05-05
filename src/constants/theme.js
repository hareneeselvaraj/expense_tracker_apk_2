export const THEMES = {
  light: {
    bg: "#FAF8F5", // warm cream
    surface: "#FFFFFF", 
    card: "#FFFFFF", 
    border: "rgba(0, 0, 0, 0.06)",
    borderLight: "rgba(0, 0, 0, 0.03)", 
    text: "#1A1A2E", // dark text
    sub: "#8B8FA3", // muted text
    muted: "#F0F0F4",
    input: "#F5F6F8", 
    shadow: "0 8px 32px 0 rgba(124, 92, 252, 0.06), 0 2px 8px 0 rgba(0,0,0,0.02)",
    glass: "", // removed blur
    navBg: "rgba(255, 255, 255, 0.98)", 
    headerBg: "rgba(250, 248, 245, 0.98)",
    glow1: "transparent", 
    glow2: "transparent",
    cardGlow: "none",
    isGlass: false,
    pastel: ["#E8DEFC", "#FFDFD6", "#D4F0E8", "#FFD6E8", "#D6EBFF", "#FFF0D6"] // lavender, peach, mint, rose, sky, amber
  },
  dark: {
    bg: "#0d0f1e", // deep navy
    surface: "rgba(26, 26, 46, 0.95)", 
    card: "rgba(26, 26, 46, 0.8)", 
    border: "rgba(255, 255, 255, 0.06)",
    borderLight: "rgba(255, 255, 255, 0.03)", 
    text: "#FFFFFF", 
    sub: "#8B8FA3", 
    muted: "rgba(40, 40, 60, 0.6)",
    input: "rgba(35, 35, 55, 0.9)", 
    shadow: "0 12px 48px 0 rgba(0, 0, 0, 0.5)",
    glass: "backdrop-filter: blur(24px);",
    navBg: "rgba(15, 13, 35, 0.95)", 
    headerBg: "rgba(15, 13, 35, 0.95)",
    glow1: "transparent", glow2: "transparent",
    cardGlow: "none",
    isGlass: false,
    pastel: ["rgba(124, 92, 252, 0.2)", "rgba(255, 107, 107, 0.2)", "rgba(52, 199, 123, 0.2)", "rgba(255, 102, 178, 0.2)", "rgba(102, 178, 255, 0.2)", "rgba(255, 178, 102, 0.2)"]
  },
  glass: {
    bg: "#050818",
    surface: "rgba(15, 15, 40, 0.55)",
    card: "rgba(15, 15, 40, 0.45)",
    border: "rgba(140, 120, 255, 0.16)",
    borderLight: "rgba(120, 100, 240, 0.10)",
    text: "#FFFFFF",
    sub: "#9a94c8",
    muted: "rgba(100, 80, 200, 0.08)",
    input: "rgba(20, 18, 50, 0.60)",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.40)",
    glass: "backdrop-filter: blur(40px) saturate(180%);",
    navBg: "rgba(10, 10, 35, 0.60)",
    headerBg: "rgba(8, 8, 30, 0.55)",
    glow1: "rgba(100, 80, 240, 0.25)",
    glow2: "rgba(140, 60, 220, 0.18)",
    cardGlow: "0 0 40px rgba(100, 80, 240, 0.08)",
    isGlass: true,
    pastel: ["rgba(120, 100, 255, 0.20)", "rgba(239, 68, 68, 0.20)", "rgba(34, 197, 94, 0.20)", "rgba(180, 100, 255, 0.20)", "rgba(59, 140, 246, 0.20)", "rgba(245, 158, 11, 0.20)"]
  }
};

export const BASE_C = {
  primary: "#7C5CFC", // purple
  secondary: "#B794F6", // light purple
  primaryDim: "rgba(124, 92, 252, 0.12)",
  income: "#34C77B", // green
  expense: "#FF6B6B", // coral
  invest: "#5C93FC", // blue
  credit: "#34C77B", 
  debit: "#FF6B6B",
  success: "#34C77B",
  warning: "#FFB03A",
  danger: "#FF6B6B",
  info: "#5C93FC",
  gradient: {
    primary: "linear-gradient(135deg, #7C5CFC 0%, #B794F6 100%)",
    income: "linear-gradient(135deg, #34C77B 0%, #6EE7B7 100%)",
    expense: "linear-gradient(135deg, #FF6B6B 0%, #FFA8A8 100%)",
    card: "linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 100%)"
  }
};
