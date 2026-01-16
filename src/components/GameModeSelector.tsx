import "./GameModeSelector.css";

interface GameModeSelectorProps {
  onModeSelect: (mode: "single" | "double") => void;
}

export default function GameModeSelector({
  onModeSelect,
}: GameModeSelectorProps) {
  return (
    <div className="mode-selector">
      <div className="mode-selector-content">
        <h1>Gorillas Game</h1>
        <p className="subtitle">Choose your game mode</p>

        <div className="mode-buttons">
          <button
            className="mode-button single-mode"
            onClick={() => onModeSelect("single")}
          >
            <div className="mode-icon">🤖</div>
            <div className="mode-title">Single Player</div>
            <div className="mode-description">Play against the computer</div>
          </button>

          <button
            className="mode-button double-mode"
            onClick={() => onModeSelect("double")}
          >
            <div className="mode-icon">👥</div>
            <div className="mode-title">Two Players</div>
            <div className="mode-description">Play against a friend</div>
          </button>
        </div>
      </div>
    </div>
  );
}
