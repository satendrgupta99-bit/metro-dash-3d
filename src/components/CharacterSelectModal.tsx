import React, { useState } from 'react';
import { Check, Lock, Coins, Shield, Zap, Sparkles, X } from 'lucide-react';
import { CharacterItem, HoverboardItem, UserProfile } from '../types/game';
import { sound } from '../services/sound';

interface CharacterSelectModalProps {
  characters: CharacterItem[];
  hoverboards: HoverboardItem[];
  profile: UserProfile;
  onSelectCharacter: (charId: string) => void;
  onUnlockCharacter: (charId: string) => void;
  onSelectHoverboard: (boardId: string) => void;
  onUnlockHoverboard: (boardId: string) => void;
  onBuyHoverboardStock: () => void;
  onClose: () => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  characters,
  hoverboards,
  profile,
  onSelectCharacter,
  onUnlockCharacter,
  onSelectHoverboard,
  onUnlockHoverboard,
  onBuyHoverboardStock,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'runners' | 'boards'>('runners');

  const selectedChar = characters.find((c) => c.id === profile.selectedCharacterId) || characters[0];
  const selectedBoard = hoverboards.find((b) => b.id === profile.selectedHoverboardId) || hoverboards[0];

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-display">
              Subway Syndicate
            </span>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
              Character & Gear Customizer
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono-numbers">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile.coins.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-slate-950/70 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveSubTab('runners')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'runners'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Urban Runners
          </button>
          <button
            onClick={() => setActiveSubTab('boards')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'boards'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hoverboard Decks
          </button>
        </div>

        {/* Tab Content: Runners */}
        {activeSubTab === 'runners' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {characters.map((char) => {
              const isUnlocked = profile.unlockedCharacters.includes(char.id);
              const isSelected = profile.selectedCharacterId === char.id;
              const canAfford = profile.coins >= char.price;

              return (
                <div
                  key={char.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Character Color Avatar Badge */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden"
                        style={{ backgroundColor: char.color }}
                      >
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: char.hairColor }}
                        />
                        <div
                          className="absolute bottom-0 w-full h-3"
                          style={{ backgroundColor: char.accentColor }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white font-display">{char.name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 capitalize">
                          {char.jacketStyle} · {char.accessory}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{char.tagline}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-mono-numbers">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{Math.round((char.speedBonus - 1) * 100)}% Speed Bonus</span>
                    </div>

                    {isUnlocked ? (
                      <button
                        onClick={() => {
                          onSelectCharacter(char.id);
                          sound.playClick();
                        }}
                        disabled={isSelected}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-slate-800 text-cyan-400'
                            : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{isSelected ? 'Equipped' : 'Equip'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onUnlockCharacter(char.id);
                          sound.playClick();
                        }}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 font-bold shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span className="font-mono-numbers">{char.price.toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Hoverboards */}
        {activeSubTab === 'boards' && (
          <div className="flex flex-col gap-4">
            {/* Inventory replenishment strip */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase font-display">
                    Hoverboard In Inventory: {profile.hoverboardInventory} Units
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Double-tap during run to survive 1 fatal train collision!
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  onBuyHoverboardStock();
                  sound.playClick();
                }}
                disabled={profile.coins < 500}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-50 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>+3 Boards (500 C)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hoverboards.map((board) => {
                const isUnlocked = profile.unlockedHoverboards.includes(board.id);
                const isSelected = profile.selectedHoverboardId === board.id;
                const canAfford = profile.coins >= board.price;

                return (
                  <div
                    key={board.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-6 rounded-md shadow-md flex items-center justify-center border"
                          style={{
                            backgroundColor: board.color,
                            borderColor: board.glowColor,
                            boxShadow: `0 0 10px ${board.glowColor}50`,
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white font-display">{board.name}</span>
                          <span className="text-xs text-slate-400 capitalize">
                            {board.trailType} Particle Trail
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{board.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-mono-numbers">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="capitalize">{board.trailType} Aura</span>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => {
                            onSelectHoverboard(board.id);
                            sound.playClick();
                          }}
                          disabled={isSelected}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-slate-800 text-cyan-400'
                              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95'
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                          <span>{isSelected ? 'Equipped' : 'Equip'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onUnlockHoverboard(board.id);
                            sound.playClick();
                          }}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 font-bold shadow-md'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span className="font-mono-numbers">{board.price.toLocaleString()}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
