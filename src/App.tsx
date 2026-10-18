import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import YandexCallback from "./pages/YandexCallback";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Rating from "./pages/Rating";
import { AuthProvider } from "@/lib/auth";
import { MemberCardProvider } from "@/lib/memberCard";
import AuthDialog from "@/components/crypto/AuthDialog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <MemberCardProvider>
          <Toaster />
          <Sonner />
          <AuthDialog />
          <BrowserRouter>
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
          </BrowserRouter>
        </MemberCardProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
