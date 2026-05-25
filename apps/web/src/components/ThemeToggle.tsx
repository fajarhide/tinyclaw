import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex shrink-0 gap-0.5 rounded-md bg-muted p-0.5"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        aria-pressed={theme === "light"}
        aria-label="Light mode"
        title="Light mode"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-sm transition",
          theme === "light"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <SunIcon className="size-3.5" />
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        aria-label="Dark mode"
        title="Dark mode"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-sm transition",
          theme === "dark"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <MoonIcon className="size-3.5" />
      </button>
    </div>
  );
}
