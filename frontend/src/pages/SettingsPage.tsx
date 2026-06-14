import { Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function SettingsPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Currently {theme} mode</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggle}>
              {theme === "dark" ? (
                <><Sun className="mr-2 h-4 w-4" /> Light Mode</>
              ) : (
                <><Moon className="mr-2 h-4 w-4" /> Dark Mode</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Add your API keys to <code className="rounded bg-muted px-1 py-0.5 text-xs">backend/.env</code> to enable:</p>
          <ul className="ml-4 list-disc space-y-1 text-xs">
            <li>AI weekly reviews (Claude)</li>
            <li>Natural language task parsing (Gemini)</li>
            <li>AI motivational messages (Claude)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Life Planner v0.1.0</p>
          <p>React + FastAPI + PostgreSQL</p>
        </CardContent>
      </Card>
    </div>
  );
}
