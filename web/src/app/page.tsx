"use client";

import React, { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import BookingForm from "@/components/Form";

export default function Home() {
  const [showApp, setShowApp] = useState(false);

  return (
    <div className="min-h-screen">
      {!showApp && <SplashScreen onComplete={() => setShowApp(true)} />}
      {showApp && (
        <main
          className="relative min-h-screen flex items-start justify-center pt-64 sm:pt-80 lg:pt-[26rem] xl:pt-[30rem] 2xl:pt-[34rem] pb-32 bg-[var(--background)] text-[var(--foreground)]"
          style={{
            backgroundImage: "url('/bgassets/pink-indian-wedding-invitation.svg')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            backgroundSize: 'cover',
          }}
        >
          {/* removed bottom rectangle per request */}
          {/* Top-corner flourishes (larger) */}
          <img src="/bgassets/5.svg" alt="decor top-left" className="pointer-events-none select-none absolute top-4 left-4 w-28 sm:w-40 md:w-56 opacity-90 [transform:scaleX(-1)] z-20" />
          <img src="/bgassets/5.svg" alt="decor top-right" className="pointer-events-none select-none absolute top-4 right-4 w-28 sm:w-40 md:w-56 opacity-90 z-20" />

          <div className="relative z-10 w-full max-w-2xl px-4 sm:px-0">
            <BookingForm />
          </div>
        </main>
      )}
    </div>
  );
}
