"use client"

import { useState } from "react"
import GorillasGame from "./components/GorillasGame"
import GameModeSelector from "./components/GameModeSelector"
import "./App.css"

type GameMode = "select" | "single" | "double"

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode>("select")

  const handleModeSelect = (mode: "single" | "double") => {
    setGameMode(mode)
  }

  const handleBackToMenu = () => {
    setGameMode("select")
  }

  return (
    <div className="app">
      {gameMode === "select" ? (
        <GameModeSelector onModeSelect={handleModeSelect} />
      ) : (
        <GorillasGame numberOfPlayers={gameMode === "single" ? 1 : 2} onBackToMenu={handleBackToMenu} />
      )}
    </div>
  )
}
