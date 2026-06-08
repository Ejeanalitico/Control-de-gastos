import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ darkMode, onToggle }: ThemeToggleProps) {
  return (
    <button
      id="theme-toggle-btn"
      onClick={onToggle}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${
        darkMode
          ? "bg-stone-900 border-stone-800 text-amber-400 hover:bg-stone-850"
          : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
      }`}
      aria-label="Toggle Theme"
    >
      {darkMode ? (
        <>
          <Moon className="w-3.5 h-3.5 fill-amber-400" />
          <span>Modo Oscuro</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5" />
          <span>Modo Claro</span>
        </>
      )}
    </button>
  );
}
