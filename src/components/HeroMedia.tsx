'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

/**
 * Optimize Hero Arka Planı:
 * - Mobilde (<768px) ve prefers-reduced-motion: reduce durumunda video yerine hafif WebP poster gösterir.
 * - Masaüstünde sıkıştırılmış hero-ambient.mp4 oynatır; video yüklenmezse sorunsuz poster/gradient fallback'e döner.
 */
export function HeroMedia() {
  const [allowVideo, setAllowVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wideScreen = window.matchMedia('(min-width: 768px)');

    const evaluate = () => {
      setAllowVideo(wideScreen.matches && !reducedMotion.matches);
    };

    evaluate();
    reducedMotion.addEventListener('change', evaluate);
    wideScreen.addEventListener('change', evaluate);
    return () => {
      reducedMotion.removeEventListener('change', evaluate);
      wideScreen.removeEventListener('change', evaluate);
    };
  }, []);

  return (
    <div className="hero-media" aria-hidden="true">
      <Image
        src="/img/hero-poster.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-poster-img"
      />
      {allowVideo && !videoFailed && (
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/img/hero-poster.webp"
          onError={() => setVideoFailed(true)}
        >
          <source src="/media/hero-ambient.mp4" type="video/mp4" />
        </video>
      )}
      <div className="hero-overlay" />
    </div>
  );
}
