import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DayView } from "@/pages/DayView";
import { WeekView } from "@/pages/WeekView";
import { MonthView } from "@/pages/MonthView";
import { YearView } from "@/pages/YearView";
import { VisionBoard } from "@/pages/VisionBoard";
import { HabitTracker } from "@/pages/HabitTracker";
import { TrackingPage } from "@/pages/TrackingPage";
import { CalendarOverview } from "@/pages/CalendarOverview";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DayView />} />
              <Route path="/week" element={<WeekView />} />
              <Route path="/month" element={<MonthView />} />
              <Route path="/year" element={<YearView />} />
              <Route path="/vision" element={<VisionBoard />} />
              <Route path="/habits" element={<HabitTracker />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/overview" element={<CalendarOverview />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
