'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(1), 3000); // Logo shows for 3s
    const timer2 = setTimeout(() => setCurrentStep(2), 6000); // Lumina shows for 3s
    const timer3 = setTimeout(() => setCurrentStep(3), 8000); // Tagline shows for 0.8s
    const timer4 = setTimeout(() => onComplete(), 8800); // Complete after 8.8s total

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: '#000000' }}>
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {!logoError ? (
              <Image
                src="/Frame 1.png"
                alt="Lumina Logo"
                width={200}
                height={200}
                className="object-contain"
                priority
                unoptimized
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="text-center">
                <h1
                  className="text-6xl font-thin text-white tracking-widest"
                  style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  Lumina
                </h1>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            key="lumina"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1
              className="text-7xl font-thin text-white tracking-widest"
              style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              Lumina
            </h1>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="tagline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <p
              className="text-2xl text-gray-400 font-light tracking-wide"
              style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              Let the parties begin.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SplashScreen;