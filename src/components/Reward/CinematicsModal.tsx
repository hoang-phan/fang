import { Button } from '../ui/Button';

interface CinematicsModalProps {
  cinematicUrls: string[];
  slideIndex: number;
  visible: boolean;
  handleCinematicClose: () => void;
  onNext?: () => void;
}

export function CinematicsModal({ cinematicUrls, slideIndex, visible, handleCinematicClose, onNext }: CinematicsModalProps) {
  if (cinematicUrls.length === 0) return <div />;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 p-4" style={{ background: 'var(--overlay-dark)' }}>
      <div className="w-full flex flex-col items-center justify-center">
        <img
          src={cinematicUrls[slideIndex]}
          alt="Level cinematic"
          className="w-5/6 rounded-lg max-h-[80vh] object-contain"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
        />
        <div className="mt-6 flex gap-3 justify-center">
          {onNext && cinematicUrls.length > 1 && (
            <Button variant="ghost" onClick={onNext}>Next →</Button>
          )}
          <Button onClick={handleCinematicClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
