"use client";

import { createContext, useContext, useEffect } from "react";
import { CompanyBranding } from "@/lib/company";

const BrandingContext = createContext<CompanyBranding | null>(null);

export function BrandingProvider({
    children,
    branding,
}: {
    children: React.ReactNode;
    branding: CompanyBranding | null;
}) {
    useEffect(() => {
        if (branding) {
            const root = document.documentElement;

            if (branding.primary_color) {
                root.style.setProperty("--brand-primary", branding.primary_color);
            }

            if (branding.secondary_color) {
                root.style.setProperty("--brand-secondary", branding.secondary_color);
            }
        }
    }, [branding]);

    return (
        <BrandingContext.Provider value={branding}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    return useContext(BrandingContext);
}
