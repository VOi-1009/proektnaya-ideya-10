import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";
import { VisitTracker } from "@/lib/visits";
import { AuthProvider } from "@/lib/auth";
import { MemberCardProvider } from "@/lib/memberCard";
import AuthDialog from "@/components/crypto/AuthDialog";

const NotFound = lazy(() => import("./pages/NotFound"));
const YandexCallback = lazy(() => import("./pages/YandexCallback"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Rating = lazy(() => import("./pages/Rating"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 } },
});

const PageFallback = () => <div className="min-h-screen bg-background" />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <MemberCardProvider>
          <Toaster />
          <Sonner />
          <AuthDialog />
          <BrowserRouter>
            <VisitTracker />
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/rating" element={<Rating />} />
              <Route
                path="/auth/yandex/callback"
                element={<YandexCallback />}
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </MemberCardProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
