'use client';

import { motion } from 'motion/react';
import Image from 'next/image';

export const RADAR_TARGETS = [
  {
    id: 1,
    user: 'senutpal',
    lang: 'TypeScript',
    action: 'building devradar',
    angle: 0,
    distance: 60,
    delay: 0,
    scanDelay: 0.3,
  },
  {
    id: 2,
    user: 'alex',
    lang: 'Python',
    action: 'pushed to main',
    angle: 80,
    distance: 40,
    delay: 0.5,
    scanDelay: 1.2,
  },
  {
    id: 3,
    user: 'jordan',
    lang: 'React',
    action: 'debugging index.tsx',
    angle: 170,
    distance: 50,
    delay: 1,
    scanDelay: 2.1,
  },
  {
    id: 4,
    user: 'sam',
    lang: 'Rust',
    action: '30-day streak',
    angle: 216,
    distance: 45,
    delay: 1.5,
    scanDelay: 0.8,
  },
  {
    id: 5,
    user: 'chris',
    lang: 'Go',
    action: 'joined network',
    angle: 330,
    distance: 45,
    delay: 2,
    scanDelay: 1.5,
  },
] as const;

export function RadarAnimation() {
  return (
    <div className="relative pt-20 w-full h-112.5 lg:h-150 flex items-center justify-center overflow-visible">
      <div className="relative w-75 h-75 md:w-112.5 md:h-112.5 lg:w-137.5 lg:h-137.5">
        <div className="absolute inset-0 rounded-full " />
        <div className="absolute inset-0 rounded-full border border-[#65a30d]/20 dark:border-[#00ff41]/20 scale-[0.75]" />
        <div className="absolute inset-0 rounded-full border border-[#65a30d]/20 dark:border-[#00ff41]/20 scale-[0.50]" />
        <div className="absolute inset-0 rounded-full border border-[#65a30d]/20 dark:border-[#00ff41]/20 scale-[0.25]" />

        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="radar-tick absolute w-1 h-3 bg-[#65a30d] dark:bg-[#00ff41]"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
            }}
          />
        ))}

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
          className="absolute inset-0 rounded-full overflow-hidden origin-center z-10 pointer-events-none"
        >
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: `conic-gradient(
                from 0deg at 50% 50%, 
                transparent 0deg, 
                rgba(16, 185, 129, 0.0) 240deg, 
                rgba(101, 163, 13, 0.3) 360deg
              )`,
            }}
          >
            <div
              className="hidden dark:block absolute inset-0 w-full h-full"
              style={{
                background: `conic-gradient(
                  from 0deg at 50% 50%, 
                  transparent 0deg, 
                  rgba(0, 255, 65, 0.0) 240deg, 
                  rgba(0, 255, 65, 0.3) 360deg
                )`,
              }}
            />
          </div>

          <div className="absolute top-0 left-1/2 w-px h-1/2 bg-[#65a30d] dark:bg-[#00ff41] origin-bottom shadow-[0_0_20px_#65a30d] dark:shadow-[0_0_20px_#00ff41]" />
        </motion.div>

        {RADAR_TARGETS.map((target) => {
          const rad = (target.angle - 90) * (Math.PI / 180);
          const x = 50 + target.distance * 0.5 * Math.cos(rad);
          const y = 50 + target.distance * 0.5 * Math.sin(rad);
          const isLeftSide = target.angle >= 180 && target.angle < 360;

          return (
            <div
              key={target.id}
              className="absolute w-0 h-0 z-20"
              style={{ top: `${y}%`, left: `${x}%` }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: target.delay,
                  ease: 'easeInOut',
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#65a30d] dark:bg-[#00ff41] rounded-full shadow-[0_0_10px_#65a30d] dark:shadow-[0_0_15px_#00ff41]"
              />

              <motion.div
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: target.delay,
                  ease: 'easeOut',
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-[#65a30d] dark:border-[#00ff41] rounded-full"
              />

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: target.delay + 0.3, duration: 0.4 }}
                className={`absolute top-1/2 h-px bg-[#65a30d] dark:bg-[#00ff41] ${
                  isLeftSide ? 'right-0 origin-right' : 'left-0 origin-left'
                }`}
                style={{ width: '32px', opacity: 0.6 }}
              />

              <motion.div
                initial={{ opacity: 0, x: isLeftSide ? -15 : 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: target.delay + 0.5, duration: 0.4 }}
                className={`absolute top-1/2 -translate-y-1/2 ${
                  isLeftSide ? 'right-8 text-right items-end' : 'left-8 text-left items-start'
                } flex flex-col w-36 md:w-44 pointer-events-auto`}
              >
                <div className="relative bg-white/80 dark:bg-black/80 backdrop-blur-md border border-[#65a30d]/40 dark:border-[#00ff41]/40 p-2.5 rounded-sm shadow-sm overflow-hidden group hover:border-[#65a30d] dark:hover:border-[#00ff41] transition-colors">
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#65a30d] dark:border-[#00ff41]" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#65a30d] dark:border-[#00ff41]" />

                  <div className="flex items-center gap-1.5 mb-2 justify-between">
                    <span className="text-[9px] font-mono text-[#65a30d] dark:text-[#00ff41] bg-[#65a30d]/10 dark:bg-[#00ff41]/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-[#65a30d]/20 dark:border-[#00ff41]/20">
                      {target.lang}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#65a30d] dark:bg-[#00ff41] animate-pulse shadow-[0_0_8px_#65a30d] dark:shadow-[0_0_8px_#00ff41]" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono truncate tracking-tight">
                      {target.user}
                    </div>
                    <div className="text-[10px] text-[#65a30d] dark:text-[#00ff41] font-mono truncate leading-tight opacity-80">
                      {target.action}
                    </div>
                  </div>

                  <motion.div
                    animate={{ top: ['0%', '100%'], opacity: [0, 0.3, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: target.scanDelay,
                    }}
                    className="absolute left-0 right-0 h-px bg-[#65a30d] dark:bg-[#00ff41] pointer-events-none"
                  />
                </div>
              </motion.div>
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white dark:bg-black border border-[#65a30d] dark:border-[#00ff41] rounded-full flex items-center justify-center z-30 ">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-40"
            >
              <Image src="/logo.png" alt="Logo" width={50} height={50} priority />
            </motion.div>

            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
              className="absolute -inset-2 border border-dashed border-[#65a30d]/40 dark:border-[#00ff41]/40 rounded-full"
            />
          </div>
        </div>

        <div className="absolute bottom-0 right-0 translate-y-8 md:translate-y-0 md:-right-12 lg:-right-24 hidden md:flex flex-col items-end gap-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#65a30d] dark:bg-[#00ff41] rounded-full animate-ping" />
            <span className="text-xs font-mono font-bold text-[#65a30d] dark:text-[#00ff41] tracking-widest">
              LIVE FEED
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#65a30d]/70 dark:text-[#00ff41]/70">
            DEVRADAR
          </span>
        </div>
      </div>
    </div>
  );
}
