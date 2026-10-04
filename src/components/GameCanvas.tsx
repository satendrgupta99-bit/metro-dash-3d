import React, { useEffect, useRef } from 'react';
import { SubwaySurfersEngine, GameEngineEvents } from '../game/threeScene';
import { CharacterItem, HoverboardItem, ThemeMode, PowerUpType } from '../types/game';

interface GameCanvasProps {
  character: CharacterItem;
  hoverboard: HoverboardItem;
  theme: ThemeMode;
  isRunning: boolean;
  isPaused: boolean;
  onScoreUpdate: (score: number, distance: number, coins: number) => void;
  onPowerUpStart: (type: PowerUpType, duration: number) => void;
  onPowerUpEnd: (type: PowerUpType) => void;
  onHoverboardDestroyed: () => void;
  onTrainDodged: () => void;
  onRoofRun: () => void;
  onRivalPassed: (rivalName: string, score: number) => void;
  onGameOver: (finalScore: number, distance: number, coins: number, trainsDodged: number, roofRuns: number) => void;
  engineRef: React.MutableRefObject<SubwaySurfersEngine | null>;
  onStartRun: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  character,
  hoverboard,
  theme,
  isRunning,
  isPaused,
  onScoreUpdate,
  onPowerUpStart,
  onPowerUpEnd,
  onHoverboardDestroyed,
  onTrainDodged,
  onRoofRun,
  onRivalPassed,
  onGameOver,
  engineRef,
  onStartRun,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const events: GameEngineEvents = {
      onScoreUpdate,
      onPowerUpStart,
      onPowerUpEnd,
      onHoverboardDestroyed,
      onTrainDodged,
      onRoofRun,
      onRivalPassed,
      onGameOver,
    };

    const engine = new SubwaySurfersEngine(
      containerRef.current,
      character,
      hoverboard,
      theme,
      events
    );
    engineRef.current = engine;

    if (isRunning && !isPaused) {
      engine.startRun();
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update character / hoverboard when changed in customization
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateCharacterAndHoverboard(character, hoverboard);
    }
  }, [character, hoverboard]);

  // Update theme when changed
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateTheme(theme);
    }
  }, [theme]);

  // Pause / Resume run state
  useEffect(() => {
    if (!engineRef.current) return;
    if (isRunning) {
      if (isPaused) {
        engineRef.current.pauseRun();
      } else {
        engineRef.current.resumeRun();
      }
    }
  }, [isRunning, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (!isRunning) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
          onStartRun();
          return;
        }
      }

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          engine.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          engine.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
          engine.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          engine.slide();
          break;
        case 'Space':
          engine.activateHoverboard();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, onStartRun]);

  // Responsive Touch Gestures (Swipe + Double Tap)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const now = Date.now();

      // Check double tap for hoverboard
      if (now - lastTapRef.current < 300) {
        if (engineRef.current && isRunning) {
          engineRef.current.activateHoverboard();
        }
      }
      lastTapRef.current = now;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // If user is on start screen, a tap or swipe starts the run
      if (!isRunning) {
        onStartRun();
        touchStartRef.current = null;
        return;
      }

      const engine = engineRef.current;
      if (!engine) return;

      const minSwipeDistance = 25;

      if (Math.max(absX, absY) > minSwipeDistance) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX < 0) {
            engine.moveLeft();
          } else {
            engine.moveRight();
          }
        } else {
          // Vertical swipe
          if (deltaY < 0) {
            engine.jump();
          } else {
            engine.slide();
          }
        }
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
    />
  );
};
