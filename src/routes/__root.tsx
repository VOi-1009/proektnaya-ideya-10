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
import {useFaviconSync} from "@/lib/graphics";
import {MemberCardProvider} from "@/lib/memberCard";
import AuthDialog from "@/components/crypto/AuthDialog";
import NotFound from "@/pages/NotFound";
import CookieBanner from "@/components/legal/CookieBanner";

const SITE = "https://traderka.ru";
const TITLE = "TRADERKA.RU — крипто сообщество, курсы и новости бесплатно";
const DESCRIPTION =
    "Бесплатное крипто сообщество трейдеров: курсы криптовалют онлайн, графики, новости рынка, идеи и мнения участников, рейтинг, очки, статусы и бонусы за активность.";
const KEYWORDS =
    "крипто сообщество, соцсеть для трейдеров, курсы криптовалют, новости криптовалют, биткоин, эфир, идеи трейдеров, мнения о рынке, рейтинг трейдеров, бонусы, бесплатно, ликвидации, притоки на биржи, портфель, конвертер";
const JSON_LD = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": `${SITE}/#org`,
            name: "TRADERKA.RU",
            url: SITE,
            logo: `${SITE}/favicon.svg`,
            description: DESCRIPTION,
        },
        {
            "@type": "WebSite",
            "@id": `${SITE}/#site`,
            url: SITE,
            name: "TRADERKA.RU",
            inLanguage: "ru-RU",
            description: DESCRIPTION,
            publisher: {"@id": `${SITE}/#org`},
        },
    ],
});
const OG_IMAGE = "https://cdn.poehali.dev/projects/***/files/og-image-1792240276264.jpg";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {name: "viewport", content: "width=device-width, initial-scale=1.0"},
            {title: TITLE},
            {name: "description", content: DESCRIPTION},
            {name: "author", content: "TRADERKA.RU"},
            {name: "keywords", content: KEYWORDS},
            {name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1"},
            {name: "theme-color", content: "#1f2024"},
            {property: "og:type", content: "website"},
            {property: "og:site_name", content: "TRADERKA.RU"},
            {property: "og:locale", content: "ru_RU"},
            {name: "twitter:card", content: "summary_large_image"},
            {name: "twitter:title", content: TITLE},
            {name: "twitter:description", content: DESCRIPTION},
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
            {type: "application/ld+json", children: JSON_LD},
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFound,
});

function RootComponent() {
    return <RootInner/>;
}

function FaviconSync() {
    useFaviconSync();
    return null;
}

function RootInner() {
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
                            <FaviconSync/>
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