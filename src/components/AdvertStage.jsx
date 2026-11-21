import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, Video } from 'lucide-react';

export default function AdvertStage({ adverts = [], onCtaClick, previewAdvert = null }) {
  const list = previewAdvert ? [previewAdvert] : adverts;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const safeIdx = list.length ? idx % list.length : 0;
  const current = list[safeIdx];

  useEffect(() => {
    if (previewAdvert || paused || list.length <= 1) return;
    const ms = Math.max(3, Number(current?.duration_sec || 6)) * 1000;
    const timer = setTimeout(() => {
      setIdx((i) => (i + 1) % list.length);
    }, ms);
    return () => clearTimeout(timer);
  }, [safeIdx, paused, list.length, current?.duration_sec, previewAdvert]);

  if (!current) {
    return (
      <div className="advert-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3cc73', padding: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={32} style={{ margin: '0 auto 10px' }} />
          <h4>Uganda Prisons Service Showcase</h4>
          <p style={{ fontSize: '0.86rem', color: '#c8dcd1' }}>Upload photo or video adverts in the Admin Portal to animate here automatically.</p>
        </div>
      </div>
    );
  }

  const animClass = `anim-${current.animation_style || 'ken-burns'}`;
  const dur = Math.max(3, Number(current.duration_sec || 6));

  return (
    <div className={`advert-stage ${animClass}`} key={`${current.id || 'preview'}-${safeIdx}`}>
      <div className="advert-media-wrap">
        {current.media_type === 'video' ? (
          <video
            className="advert-media"
            src={current.media_url}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img className="advert-media" src={current.media_url} alt={current.title} />
        )}
      </div>

      <div className="advert-overlay">
        <div className="advert-top-bar">
          <span className="advert-badge">
            {current.media_type === 'video' ? <Video size={13} /> : <Sparkles size={13} />}
            {current.badge_text || 'OFFICIAL PROMO'}
          </span>

          {!previewAdvert && list.length > 1 && (
            <div className="advert-controls">
              <button
                className="advert-ctrl-btn"
                title="Previous advert"
                onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="advert-ctrl-btn"
                title={paused ? 'Resume animation' : 'Pause animation'}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                className="advert-ctrl-btn"
                title="Next advert"
                onClick={() => setIdx((i) => (i + 1) % list.length)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="advert-content">
          <h3>{current.title}</h3>
          {current.subtitle && <p>{current.subtitle}</p>}
          <div className="advert-bottom-row">
            {current.price_callout && <span className="advert-price-pill">{current.price_callout}</span>}
            {onCtaClick && (
              <button className="btn btn-gold btn-sm" onClick={() => onCtaClick(current)}>
                {current.cta_text || 'Shop Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!previewAdvert && list.length > 1 && !paused && (
        <div className="advert-progress-track">
          <div
            className="advert-progress-bar"
            style={{ animationDuration: `${dur}s` }}
          />
        </div>
      )}
    </div>
  );
}
