import { useEffect, useRef, useState } from "react";
import "../styles/gorillas.css";

interface GorillasGameProps {
  numberOfPlayers: number;
  onBackToMenu: () => void;
}

type BestThrow = {
  velocityX: number | undefined;
  velocityY: number | undefined;
  distance: number;
};

export default function GorillasGame({
  numberOfPlayers,
  onBackToMenu,
}: GorillasGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bombGrabAreaRef = useRef<HTMLDivElement>(null);
  const angle1DOMRef = useRef<HTMLSpanElement>(null);
  const velocity1DOMRef = useRef<HTMLSpanElement>(null);
  const angle2DOMRef = useRef<HTMLSpanElement>(null);
  const velocity2DOMRef = useRef<HTMLSpanElement>(null);
  const congratulationsDOMRef = useRef<HTMLDivElement>(null);
  const winnerDOMRef = useRef<HTMLSpanElement>(null);
  const newGameButtonRef = useRef<HTMLButtonElement>(null);

  const stateRef = useRef<any>({});
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef<number | undefined>(undefined);
  const dragStartYRef = useRef<number | undefined>(undefined);
  const previousAnimationTimestampRef = useRef<number | undefined>(undefined);
  const numberOfPlayersRef = useRef(numberOfPlayers);
  const simulationModeRef = useRef(false);
  const simulationImpactRef = useRef<any>({});
  const blastHoleRadiusRef = useRef(18);

  const [gameInitialized, setGameInitialized] = useState(false);

  useEffect(() => {
    numberOfPlayersRef.current = numberOfPlayers;
  }, [numberOfPlayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      calculateScale();
      initializeBombPosition();
      draw();
    };

    window.addEventListener("resize", handleResize);

    newGame();
    setGameInitialized(true);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCtx = () => canvasRef.current?.getContext("2d");

  const generateBackgroundBuilding = (index: number) => {
    const previousBuilding = stateRef.current.backgroundBuildings[index - 1];
    const x = previousBuilding
      ? previousBuilding.x + previousBuilding.width + 4
      : -30;

    const minWidth = 60;
    const maxWidth = 110;
    const width = minWidth + Math.random() * (maxWidth - minWidth);

    const minHeight = 80;
    const maxHeight = 350;
    const height = minHeight + Math.random() * (maxHeight - minHeight);

    stateRef.current.backgroundBuildings.push({ x, width, height });
  };

  const generateBuilding = (index: number) => {
    const previousBuilding = stateRef.current.buildings[index - 1];
    const x = previousBuilding
      ? previousBuilding.x + previousBuilding.width + 4
      : 0;

    const minWidth = 80;
    const maxWidth = 130;
    const width = minWidth + Math.random() * (maxWidth - minWidth);

    const platformWithGorilla = index === 1 || index === 6;

    const minHeight = 40;
    const maxHeight = 300;
    const minHeightGorilla = 30;
    const maxHeightGorilla = 150;

    const height = platformWithGorilla
      ? minHeightGorilla + Math.random() * (maxHeightGorilla - minHeightGorilla)
      : minHeight + Math.random() * (maxHeight - minHeight);

    const lightsOn = [];
    for (let i = 0; i < 50; i++) {
      lightsOn.push(Math.random() <= 0.33);
    }

    stateRef.current.buildings.push({ x, width, height, lightsOn });
  };

  const calculateScale = () => {
    const lastBuilding = stateRef.current.buildings.at(-1);
    const totalWidthOfTheCity = lastBuilding.x + lastBuilding.width;
    stateRef.current.scale = window.innerWidth / totalWidthOfTheCity;
  };

  const initializeBombPosition = () => {
    const building =
      stateRef.current.currentPlayer === 1
        ? stateRef.current.buildings.at(1)
        : stateRef.current.buildings.at(-2);

    const gorillaX = building.x + building.width / 2;
    const gorillaY = building.height;

    const gorillaHandOffsetX = stateRef.current.currentPlayer === 1 ? -28 : 28;
    const gorillaHandOffsetY = 107;

    stateRef.current.bomb.x = gorillaX + gorillaHandOffsetX;
    stateRef.current.bomb.y = gorillaY + gorillaHandOffsetY;
    stateRef.current.bomb.velocity.x = 0;
    stateRef.current.bomb.velocity.y = 0;
    stateRef.current.bomb.rotation = 0;

    if (bombGrabAreaRef.current) {
      const grabAreaRadius = 15;
      const left =
        stateRef.current.bomb.x * stateRef.current.scale - grabAreaRadius;
      const bottom =
        stateRef.current.bomb.y * stateRef.current.scale - grabAreaRadius;
      bombGrabAreaRef.current.style.left = `${left}px`;
      bombGrabAreaRef.current.style.bottom = `${bottom}px`;
    }
  };

  const newGame = () => {
    stateRef.current = {
      phase: "aiming",
      currentPlayer: 1,
      round: 1,
      bomb: {
        x: undefined,
        y: undefined,
        rotation: 0,
        velocity: { x: 0, y: 0 },
      },
      backgroundBuildings: [],
      buildings: [],
      blastHoles: [],
      scale: 1,
    };

    for (let i = 0; i < 11; i++) {
      generateBackgroundBuilding(i);
    }

    for (let i = 0; i < 8; i++) {
      generateBuilding(i);
    }

    calculateScale();
    initializeBombPosition();

    if (congratulationsDOMRef.current) {
      congratulationsDOMRef.current.style.visibility = "hidden";
    }
    if (angle1DOMRef.current) angle1DOMRef.current.innerText = "0";
    if (velocity1DOMRef.current) velocity1DOMRef.current.innerText = "0";
    if (angle2DOMRef.current) angle2DOMRef.current.innerText = "0";
    if (velocity2DOMRef.current) velocity2DOMRef.current.innerText = "0";

    draw();

    // In double mode, player 1 always starts (human), so no auto-throw
    if (
      numberOfPlayersRef.current === 1 &&
      stateRef.current.currentPlayer === 2
    ) {
      computerThrow();
    }
  };

  // Drawing functions
  const draw = () => {
    const ctx = getCtx();
    if (!ctx) return;

    ctx.save();
    ctx.translate(0, window.innerHeight);
    ctx.scale(1, -1);
    ctx.scale(stateRef.current.scale, stateRef.current.scale);

    drawBackground(ctx);
    drawBackgroundBuildings(ctx);
    drawBuildingsWithBlastHoles(ctx);
    drawGorilla(ctx, 1);
    drawGorilla(ctx, 2);
    drawBomb(ctx);

    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(
      0,
      0,
      0,
      window.innerHeight / stateRef.current.scale
    );
    gradient.addColorStop(1, "#F8BA85");
    gradient.addColorStop(0, "#FFC28E");

    ctx.fillStyle = gradient;
    ctx.fillRect(
      0,
      0,
      window.innerWidth / stateRef.current.scale,
      window.innerHeight / stateRef.current.scale
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(300, 350, 60, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawBackgroundBuildings = (ctx: CanvasRenderingContext2D) => {
    stateRef.current.backgroundBuildings.forEach((building: any) => {
      ctx.fillStyle = "#947285";
      ctx.fillRect(building.x, 0, building.width, building.height);
    });
  };

  const drawBuildingsWithBlastHoles = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    stateRef.current.blastHoles.forEach((blastHole: any) => {
      ctx.beginPath();
      ctx.rect(
        0,
        0,
        window.innerWidth / stateRef.current.scale,
        window.innerHeight / stateRef.current.scale
      );
      ctx.arc(
        blastHole.x,
        blastHole.y,
        blastHoleRadiusRef.current,
        0,
        2 * Math.PI,
        true
      );
      ctx.clip();
    });

    drawBuildings(ctx);
    ctx.restore();
  };

  const drawBuildings = (ctx: CanvasRenderingContext2D) => {
    stateRef.current.buildings.forEach((building: any) => {
      ctx.fillStyle = "#4A3C68";
      ctx.fillRect(building.x, 0, building.width, building.height);

      const windowWidth = 10;
      const windowHeight = 12;
      const gap = 15;

      const numberOfFloors = Math.ceil(
        (building.height - gap) / (windowHeight + gap)
      );
      const numberOfRoomsPerFloor = Math.floor(
        (building.width - gap) / (windowWidth + gap)
      );

      for (let floor = 0; floor < numberOfFloors; floor++) {
        for (let room = 0; room < numberOfRoomsPerFloor; room++) {
          if (building.lightsOn[floor * numberOfRoomsPerFloor + room]) {
            ctx.save();
            ctx.translate(building.x + gap, building.height - gap);
            ctx.scale(1, -1);

            const x = room * (windowWidth + gap);
            const y = floor * (windowHeight + gap);

            ctx.fillStyle = "#EBB6A2";
            ctx.fillRect(x, y, windowWidth, windowHeight);

            ctx.restore();
          }
        }
      }
    });
  };

  const drawGorilla = (ctx: CanvasRenderingContext2D, player: number) => {
    ctx.save();

    const building =
      player === 1
        ? stateRef.current.buildings.at(1)
        : stateRef.current.buildings.at(-2);

    ctx.translate(building.x + building.width / 2, building.height);

    drawGorillaBody(ctx);
    drawGorillaLeftArm(ctx, player);
    drawGorillaRightArm(ctx, player);
    drawGorillaFace(ctx, player);
    drawGorillaThoughtBubbles(ctx, player);

    ctx.restore();
  };

  const drawGorillaBody = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-17, 18);
    ctx.lineTo(-20, 44);
    ctx.lineTo(-11, 77);
    ctx.lineTo(0, 84);
    ctx.lineTo(11, 77);
    ctx.lineTo(20, 44);
    ctx.lineTo(17, 18);
    ctx.lineTo(20, 0);
    ctx.lineTo(7, 0);
    ctx.fill();
  };

  const drawGorillaLeftArm = (
    ctx: CanvasRenderingContext2D,
    player: number
  ) => {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(-14, 50);

    if (
      stateRef.current.phase === "aiming" &&
      stateRef.current.currentPlayer === 1 &&
      player === 1
    ) {
      ctx.quadraticCurveTo(
        -44,
        63,
        -28 - stateRef.current.bomb.velocity.x / 6.25,
        107 - stateRef.current.bomb.velocity.y / 6.25
      );
    } else if (
      stateRef.current.phase === "celebrating" &&
      stateRef.current.currentPlayer === player
    ) {
      ctx.quadraticCurveTo(-44, 63, -28, 107);
    } else {
      ctx.quadraticCurveTo(-44, 45, -28, 12);
    }

    ctx.stroke();
  };

  const drawGorillaRightArm = (
    ctx: CanvasRenderingContext2D,
    player: number
  ) => {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(+14, 50);

    if (
      stateRef.current.phase === "aiming" &&
      stateRef.current.currentPlayer === 2 &&
      player === 2
    ) {
      ctx.quadraticCurveTo(
        +44,
        63,
        +28 - stateRef.current.bomb.velocity.x / 6.25,
        107 - stateRef.current.bomb.velocity.y / 6.25
      );
    } else if (
      stateRef.current.phase === "celebrating" &&
      stateRef.current.currentPlayer === player
    ) {
      ctx.quadraticCurveTo(+44, 63, +28, 107);
    } else {
      ctx.quadraticCurveTo(+44, 45, +28, 12);
    }

    ctx.stroke();
  };

  const drawGorillaFace = (ctx: CanvasRenderingContext2D, player: number) => {
    ctx.fillStyle = "lightgray";
    ctx.beginPath();
    ctx.arc(0, 63, 9, 0, 2 * Math.PI);
    ctx.moveTo(-3.5, 70);
    ctx.arc(-3.5, 70, 4, 0, 2 * Math.PI);
    ctx.moveTo(+3.5, 70);
    ctx.arc(+3.5, 70, 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(-3.5, 70, 1.4, 0, 2 * Math.PI);
    ctx.moveTo(+3.5, 70);
    ctx.arc(+3.5, 70, 1.4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(-3.5, 66.5);
    ctx.lineTo(-1.5, 65);
    ctx.moveTo(3.5, 66.5);
    ctx.lineTo(1.5, 65);
    ctx.stroke();

    ctx.beginPath();
    if (
      stateRef.current.phase === "celebrating" &&
      stateRef.current.currentPlayer === player
    ) {
      ctx.moveTo(-5, 60);
      ctx.quadraticCurveTo(0, 56, 5, 60);
    } else {
      ctx.moveTo(-5, 56);
      ctx.quadraticCurveTo(0, 60, 5, 56);
    }
    ctx.stroke();
  };

  const drawGorillaThoughtBubbles = (
    ctx: CanvasRenderingContext2D,
    player: number
  ) => {
    if (stateRef.current.phase === "aiming") {
      // Single mode (numberOfPlayers === 1): Computer is player 2
      // Double mode (numberOfPlayers === 2): No computer
      const currentPlayerIsComputer =
        numberOfPlayersRef.current === 1 &&
        stateRef.current.currentPlayer === 2 &&
        player === 2;

      if (currentPlayerIsComputer) {
        ctx.save();
        ctx.scale(1, -1);

        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", 0, -90);

        ctx.font = "10px sans-serif";

        ctx.rotate((5 / 180) * Math.PI);
        ctx.fillText("?", 0, -90);

        ctx.rotate((-10 / 180) * Math.PI);
        ctx.fillText("?", 0, -90);

        ctx.restore();
      }
    }
  };

  const drawBomb = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(stateRef.current.bomb.x, stateRef.current.bomb.y);

    if (stateRef.current.phase === "aiming") {
      ctx.translate(
        -stateRef.current.bomb.velocity.x / 6.25,
        -stateRef.current.bomb.velocity.y / 6.25
      );

      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.setLineDash([3, 8]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        stateRef.current.bomb.velocity.x,
        stateRef.current.bomb.velocity.y
      );
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, 2 * Math.PI);
      ctx.fill();
    } else if (stateRef.current.phase === "in flight") {
      ctx.fillStyle = "white";
      ctx.rotate(stateRef.current.bomb.rotation);
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.quadraticCurveTo(0, 12, 8, -2);
      ctx.quadraticCurveTo(0, 2, -8, -2);
      ctx.fill();
    } else {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.restore();
  };

  const setInfo = (deltaX: number, deltaY: number) => {
    const hypotenuse = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const angleInRadians = Math.asin(deltaY / hypotenuse);
    const angleInDegrees = (angleInRadians / Math.PI) * 180;

    if (stateRef.current.currentPlayer === 1) {
      if (angle1DOMRef.current)
        angle1DOMRef.current.innerText = Math.round(angleInDegrees).toString();
      if (velocity1DOMRef.current)
        velocity1DOMRef.current.innerText = Math.round(hypotenuse).toString();
    } else {
      if (angle2DOMRef.current)
        angle2DOMRef.current.innerText = Math.round(angleInDegrees).toString();
      if (velocity2DOMRef.current)
        velocity2DOMRef.current.innerText = Math.round(hypotenuse).toString();
    }
  };

  const throwBomb = () => {
    if (simulationModeRef.current) {
      previousAnimationTimestampRef.current = 0;
      animate(16);
    } else {
      stateRef.current.phase = "in flight";
      previousAnimationTimestampRef.current = undefined;
      requestAnimationFrame(animate);
    }
  };

  const moveBomb = (elapsedTime: number) => {
    const multiplier = elapsedTime / 200;

    stateRef.current.bomb.velocity.y -= 20 * multiplier;
    stateRef.current.bomb.x += stateRef.current.bomb.velocity.x * multiplier;
    stateRef.current.bomb.y += stateRef.current.bomb.velocity.y * multiplier;

    const direction = stateRef.current.currentPlayer === 1 ? -1 : +1;
    stateRef.current.bomb.rotation += direction * 5 * multiplier;
  };

  const checkFrameHit = () => {
    return (
      stateRef.current.bomb.y < 0 ||
      stateRef.current.bomb.x < 0 ||
      stateRef.current.bomb.x > window.innerWidth / stateRef.current.scale
    );
  };

  const checkBuildingHit = () => {
    for (let i = 0; i < stateRef.current.buildings.length; i++) {
      const building = stateRef.current.buildings[i];
      if (
        stateRef.current.bomb.x + 4 > building.x &&
        stateRef.current.bomb.x - 4 < building.x + building.width &&
        stateRef.current.bomb.y - 4 < 0 + building.height
      ) {
        for (let j = 0; j < stateRef.current.blastHoles.length; j++) {
          const blastHole = stateRef.current.blastHoles[j];

          const horizontalDistance = stateRef.current.bomb.x - blastHole.x;
          const verticalDistance = stateRef.current.bomb.y - blastHole.y;
          const distance = Math.sqrt(
            horizontalDistance ** 2 + verticalDistance ** 2
          );
          if (distance < blastHoleRadiusRef.current) {
            return false;
          }
        }

        if (!simulationModeRef.current) {
          stateRef.current.blastHoles.push({
            x: stateRef.current.bomb.x,
            y: stateRef.current.bomb.y,
          });
        }
        return true;
      }
    }
  };

  const checkGorillaHit = () => {
    const ctx = getCtx();
    if (!ctx) return false;

    const enemyPlayer = stateRef.current.currentPlayer === 1 ? 2 : 1;
    const enemyBuilding =
      enemyPlayer === 1
        ? stateRef.current.buildings.at(1)
        : stateRef.current.buildings.at(-2);

    ctx.save();

    ctx.translate(
      enemyBuilding.x + enemyBuilding.width / 2,
      enemyBuilding.height
    );

    drawGorillaBody(ctx);
    let hit = ctx.isPointInPath(
      stateRef.current.bomb.x,
      stateRef.current.bomb.y
    );

    drawGorillaLeftArm(ctx, enemyPlayer);
    hit ||= ctx.isPointInStroke(
      stateRef.current.bomb.x,
      stateRef.current.bomb.y
    );

    drawGorillaRightArm(ctx, enemyPlayer);
    hit ||= ctx.isPointInStroke(
      stateRef.current.bomb.x,
      stateRef.current.bomb.y
    );

    ctx.restore();

    return hit;
  };

  const announceWinner = () => {
    if (winnerDOMRef.current) {
      winnerDOMRef.current.innerText = `Player ${stateRef.current.currentPlayer}`;
    }
    if (congratulationsDOMRef.current) {
      congratulationsDOMRef.current.style.visibility = "visible";
    }
  };

  const runSimulations = (numberOfSimulations: number) => {
    let bestThrow: BestThrow = {
      velocityX: undefined,
      velocityY: undefined,
      distance: Number.POSITIVE_INFINITY,
    };
    simulationModeRef.current = true;

    const enemyBuilding =
      stateRef.current.currentPlayer === 1
        ? stateRef.current.buildings.at(-2)
        : stateRef.current.buildings.at(1);
    const enemyX = enemyBuilding.x + enemyBuilding.width / 2;
    const enemyY = enemyBuilding.height + 30;

    for (let i = 0; i < numberOfSimulations; i++) {
      const angleInDegrees = 0 + Math.random() * 90;
      const angleInRadians = (angleInDegrees / 180) * Math.PI;
      const velocity = 40 + Math.random() * 100;

      const direction = stateRef.current.currentPlayer === 1 ? 1 : -1;
      const velocityX = Math.cos(angleInRadians) * velocity * direction;
      const velocityY = Math.sin(angleInRadians) * velocity;

      initializeBombPosition();
      stateRef.current.bomb.velocity.x = velocityX;
      stateRef.current.bomb.velocity.y = velocityY;

      throwBomb();

      const distance = Math.sqrt(
        (enemyX - simulationImpactRef.current.x) ** 2 +
          (enemyY - simulationImpactRef.current.y) ** 2
      );

      if (distance < bestThrow.distance) {
        bestThrow = { velocityX, velocityY, distance };
      }
    }

    simulationModeRef.current = false;
    return bestThrow;
  };

  const computerThrow = () => {
    const numberOfSimulations = 2 + stateRef.current.round * 3;
    const bestThrow = runSimulations(numberOfSimulations);

    initializeBombPosition();
    stateRef.current.bomb.velocity.x = bestThrow.velocityX;
    stateRef.current.bomb.velocity.y = bestThrow.velocityY;
    if (
      bestThrow.velocityX !== undefined &&
      bestThrow.velocityY !== undefined
    ) {
      setInfo(bestThrow.velocityX, bestThrow.velocityY);
    }

    draw();

    setTimeout(throwBomb, 1000);
  };

  const animate = (timestamp: number) => {
    if (previousAnimationTimestampRef.current === undefined) {
      previousAnimationTimestampRef.current = timestamp;
      requestAnimationFrame(animate);
      return;
    }

    const elapsedTime = timestamp - previousAnimationTimestampRef.current;

    const hitDetectionPrecision = 10;
    for (let i = 0; i < hitDetectionPrecision; i++) {
      moveBomb(elapsedTime / hitDetectionPrecision);

      const miss = checkFrameHit() || checkBuildingHit();
      const hit = checkGorillaHit();

      if (simulationModeRef.current && (hit || miss)) {
        simulationImpactRef.current = {
          x: stateRef.current.bomb.x,
          y: stateRef.current.bomb.y,
        };
        return;
      }

      if (miss) {
        stateRef.current.currentPlayer =
          stateRef.current.currentPlayer === 1 ? 2 : 1;
        if (stateRef.current.currentPlayer === 1) stateRef.current.round++;
        stateRef.current.phase = "aiming";
        initializeBombPosition();

        draw();

        // Single mode: Computer throws only when currentPlayer === 2
        // Double mode: Never computer throw (numberOfPlayers === 2)
        const computerThrowsNext =
          numberOfPlayersRef.current === 1 &&
          stateRef.current.currentPlayer === 2;

        if (computerThrowsNext) setTimeout(computerThrow, 50);

        return;
      }

      if (hit) {
        stateRef.current.phase = "celebrating";
        announceWinner();

        draw();
        return;
      }
    }

    if (!simulationModeRef.current) draw();

    previousAnimationTimestampRef.current = timestamp;
    if (simulationModeRef.current) {
      animate(timestamp + 16);
    } else {
      requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (!gameInitialized) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (stateRef.current.phase === "aiming") {
        isDraggingRef.current = true;
        dragStartXRef.current = e.clientX;
        dragStartYRef.current = e.clientY;
        document.body.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartXRef.current!;
        const deltaY = e.clientY - dragStartYRef.current!;

        stateRef.current.bomb.velocity.x = -deltaX;
        stateRef.current.bomb.velocity.y = deltaY;
        setInfo(deltaX, deltaY);

        draw();
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "default";

        throwBomb();
      }
    };

    const bombGrabArea = bombGrabAreaRef.current;
    if (bombGrabArea) {
      bombGrabArea.addEventListener("mousedown", handleMouseDown);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const newGameButton = newGameButtonRef.current;
    if (newGameButton) {
      newGameButton.addEventListener("click", newGame);
    }

    return () => {
      if (bombGrabArea) {
        bombGrabArea.removeEventListener("mousedown", handleMouseDown);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (newGameButton) {
        newGameButton.removeEventListener("click", newGame);
      }
    };
  }, [gameInitialized]);

  return (
    <div className="gorillas-container">
      <button className="back-button" onClick={onBackToMenu}>
        ← Back to Menu
      </button>

      <canvas id="game" ref={canvasRef} />

      <div id="info-left">
        <h3>Player 1</h3>
        <p>
          Angle:{" "}
          <span className="angle" ref={angle1DOMRef}>
            0
          </span>
          °
        </p>
        <p>
          Velocity:{" "}
          <span className="velocity" ref={velocity1DOMRef}>
            0
          </span>
        </p>
      </div>

      <div id="info-right">
        <h3>Player 2</h3>
        <p>
          Angle:{" "}
          <span className="angle" ref={angle2DOMRef}>
            0
          </span>
          °
        </p>
        <p>
          Velocity:{" "}
          <span className="velocity" ref={velocity2DOMRef}>
            0
          </span>
        </p>
      </div>

      <div id="bomb-grab-area" ref={bombGrabAreaRef} />

      <div id="congratulations" ref={congratulationsDOMRef}>
        <h1>
          <span id="winner" ref={winnerDOMRef}>
            ?
          </span>{" "}
          won!
        </h1>
        <button id="new-game" ref={newGameButtonRef}>
          New Game
        </button>
      </div>
    </div>
  );
}
