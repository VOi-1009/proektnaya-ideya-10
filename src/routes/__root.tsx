import {type ReactNode, useState} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import appCss from "@/index.css?url";
import {VisitTracker} from "@/lib/visits";
import {AuthProvider} from "@/lib/auth";
import {MemberCardProvider} from "@/lib/memberCard";
import AuthDialog from "@/components/crypto/AuthDialog";
import NotFound from "@/pages/NotFound";
import CookieBanner from "@/components/legal/CookieBanner";

const TITLE = "TRADERKA.RU — котировки, графики и криптоновости";
const DESCRIPTION =
    "Курсы криптовалют онлайн, графики за любой период и свежие новости рынка для трейдеров — в одном удобном окне.";
const OG_IMAGE = "https://cdn.poehali.dev/projects/***/files/og-image-1792240276264.jpg";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {name: "viewport", content: "width=device-width, initial-scale=1.0"},
            {title: TITLE},
            {name: "description", content: DESCRIPTION},
            {name: "author", content: "TRADERKA.RU"},
            {name: "yandex-verification", content: "28fe9a28479a2fec"},
            {property: "og:title", content: TITLE},
            {property: "og:description", content: DESCRIPTION},
            {property: "og:image", content: OG_IMAGE},
            {property: "og:image:width", content: "1360"},
            {property: "og:image:height", content: "768"},
            {property: "og:image:alt", content: "TRADERKA.RU — котировки и новости крипторынка"},
            {name: "twitter:image", content: OG_IMAGE},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "stylesheet", href: appCss},
            {rel: "icon", type: "image/svg+xml", href: "/favicon.svg"},
            {rel: "preconnect", href: "https://fonts.googleapis.com"},
            {rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous"},
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Unbounded:wght@500;700;800&display=swap",
            },
        ],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFound,
});

function RootComponent() {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {queries: {refetchOnWindowFocus: false, retry: 1, staleTime: 30_000}},
            }),
    );
    return (
        <RootDocument>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <TooltipProvider>
                        <MemberCardProvider>
                            <Toaster/>
                            <Sonner/>
                            <AuthDialog/>
                            <VisitTracker/>
                            <CookieBanner/>
                            <Outlet/>
                        </MemberCardProvider>
                    </TooltipProvider>
                </AuthProvider>
            </QueryClientProvider>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru">
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
        <Scripts/>
        </body>
        </html>
    );
}