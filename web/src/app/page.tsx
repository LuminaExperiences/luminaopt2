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
        <main className="min-h-screen flex items-start justify-center pt-16 pb-24">
          <div className="w-full max-w-2xl">
            <BookingForm />
          </div>
        </main>
      )}
    </div>
  );
}