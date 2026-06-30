import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface BackgroundHandle {
  setFill(fill: number): void;
}

interface BackgroundProps {
  backgroundUrl: string | undefined;
  backgroundColor: string;
  bgFading: boolean;
  onBgFadeOutEnd: () => void;
  /** When true, video playback is driven by setFill() on the forwarded ref */
  videoControlledExternally?: boolean;
}

export const Background = forwardRef<BackgroundHandle, BackgroundProps>(function Background({
  backgroundUrl,
  backgroundColor: _backgroundColor,
  bgFading,
  onBgFadeOutEnd,
  videoControlledExternally = false,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = backgroundUrl?.endsWith('.mp4');
  const isImage = !!(backgroundUrl && !isVideo);
  const fileParts = backgroundUrl?.split('/');
  const isEBackground = fileParts ? fileParts[fileParts.length - 1].startsWith('e') : false;

  useImperativeHandle(ref, () => ({
    setFill(fill: number) {
      if (!videoRef.current) return;
      const rate = Math.max(0, -0.1 + fill * fill * fill * 1.2);
      videoRef.current.playbackRate = rate < 0.25 ? 0 : rate;
      videoRef.current.style.opacity = String(rate);
    },
  }), []);

  useEffect(() => {
    if (!bgFading) return;
    if (isVideo && videoRef.current) {
      const el = videoRef.current;
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      const handler = () => onBgFadeOutEnd();
      el.addEventListener('transitionend', handler, { once: true });
      const fallback = setTimeout(onBgFadeOutEnd, 550);
      return () => { el.removeEventListener('transitionend', handler); clearTimeout(fallback); };
    }
    const fallback = setTimeout(onBgFadeOutEnd, 550);
    return () => clearTimeout(fallback);
  }, [bgFading, isVideo, onBgFadeOutEnd]);

  return (
    <>
      {isImage && (
        <img
          src={backgroundUrl}
          alt="background"
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isEBackground ? 'object-contain' : 'object-cover'}`}
          style={{ opacity: bgFading ? 0 : 1 }}
          onTransitionEnd={bgFading ? onBgFadeOutEnd : undefined}
        />
      )}

      {isVideo && (
        <video
          ref={videoRef}
          src={backgroundUrl}
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
          style={{ opacity: videoControlledExternally ? 0 : 1 }}
          onLoadedMetadata={() => {
            if (!videoRef.current) return;
            if (videoControlledExternally) {
              videoRef.current.playbackRate = 0;
              videoRef.current.style.opacity = '0';
            } else {
              videoRef.current.style.opacity = '1';
            }
          }}
        />
      )}
    </>
  );
});
