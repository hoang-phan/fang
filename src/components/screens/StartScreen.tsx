import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction } from '../../reducers/gameReducer';
import type { GameState } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

export function StartScreen({ gameState, dispatch }: Props) {
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const hasSave = gameState.defeatedOpponents.length > 0 || gameState.player.name !== 'Hero' || gameState.player.level > 1;

  function handleNewGame() {
    if (hasSave) {
      setConfirmNewGame(true);
    } else {
      dispatch({ type: 'NEW_GAME' });
    }
  }

  function handleConfirmNewGame() {
    setConfirmNewGame(false);
    dispatch({ type: 'NEW_GAME' });
  }

  function handleLoadGame() {
    dispatch({ type: 'GO_TO_OPPONENT_SELECT' });
  }

  function handleGallery() {
    dispatch({ type: 'GO_TO_GALLERY' });
  }

  function handleQuit() {
    window.close();
  }

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center gap-10 px-4">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-pixel text-text-bright text-lg md:text-2xl tracking-widest">
          FANG
        </h1>
        <p className="font-pixel text-text-muted text-xs text-center">
          {gameState.player.name !== 'Hero' ? `Welcome back, ${gameState.player.name}` : ''}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <MenuButton onClick={handleLoadGame} disabled={!hasSave}>
          CONTINUE
        </MenuButton>

        <MenuButton onClick={handleNewGame} danger={hasSave}>
          NEW GAME
        </MenuButton>

        <MenuButton onClick={handleGallery} disabled={!hasSave}>
          GALLERY
        </MenuButton>

        <MenuButton onClick={handleQuit}>
          QUIT
        </MenuButton>
      </div>

      {confirmNewGame && (
        <Modal title="Start Over?">
          <div className="flex flex-col gap-6">
            <p className="font-pixel text-text-muted text-xs leading-loose">
              Your current save will be lost.<br />This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmNewGame(false)}>
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleConfirmNewGame}>
                Erase &amp; Start
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface MenuButtonProps {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

function MenuButton({ onClick, disabled, danger, children }: MenuButtonProps) {
  if (danger) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-theme-surface hover:bg-theme-hover border border-border-mid text-text-muted hover:text-red-400 hover:border-red-700 font-pixel text-xs py-4 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-theme-surface hover:bg-theme-hover border border-border-mid text-text-bright font-pixel text-xs py-4 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
