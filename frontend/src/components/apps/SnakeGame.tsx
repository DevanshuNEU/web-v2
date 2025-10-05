"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const GRID_SIZE = 20;

export default function SnakeGame() {
  const [cellSize, setCellSize] = useState(18);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [gameStatus, setGameStatus] = useState<
    "intro" | "idle" | "playing" | "paused" | "gameOver"
  >("intro");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Detect window size and adjust canvas
  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        // If window is large (maximized), use bigger cells
        const newCellSize = height > 600 ? 24 : 18;
        setCellSize(newCellSize);
      }
    };
    
    checkSize();
    const observer = new ResizeObserver(checkSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("snake-high-score");
    if (saved) setHighScore(parseInt(saved));

    // Auto-fade intro after 3 seconds
    if (gameStatus === "intro") {
      const timer = setTimeout(() => {
        setGameStatus("idle");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus]);

  const generateFood = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const checkCollision = useCallback(
    (head: Position, snakeBody: Position[]): boolean => {
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        return true;
      }
      return snakeBody.some(
        (segment) => segment.x === head.x && segment.y === head.y
      );
    },
    []
  );

  const gameLoop = useCallback(() => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };

      switch (direction) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      if (checkCollision(head, prevSnake)) {
        setGameStatus("gameOver");
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("snake-high-score", score.toString());
        }
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      if (head.x === food.x && head.y === food.y) {
        setScore((s) => s + 1);
        setFood(generateFood());
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, score, highScore, checkCollision, generateFood]);

  useEffect(() => {
    if (gameStatus === "playing") {
      gameLoopRef.current = setInterval(gameLoop, 150);
      return () => clearInterval(gameLoopRef.current);
    }
  }, [gameStatus, gameLoop]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameStatus !== "playing") return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          if (direction !== "DOWN") setDirection("UP");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          if (direction !== "UP") setDirection("DOWN");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          if (direction !== "RIGHT") setDirection("LEFT");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          if (direction !== "LEFT") setDirection("RIGHT");
          break;
        case " ":
          e.preventDefault();
          setGameStatus((prev) => (prev === "playing" ? "paused" : "playing"));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction, gameStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, GRID_SIZE * cellSize, GRID_SIZE * cellSize);

    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? "#22c55e" : "#16a34a";
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(
      food.x * cellSize + 1,
      food.y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
  }, [snake, food, cellSize]);

  const startGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection("RIGHT");
    setScore(0);
    setGameStatus("playing");
  };

  const canvasSize = GRID_SIZE * cellSize;

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center gap-6 p-8">
      {/* Intro screen */}
      {gameStatus === "intro" && (
        <div className="text-center max-w-md space-y-4 animate-fade-in">
          <p className="text-text-secondary italic leading-relaxed text-sm">
            This was my favorite game as a kid. Hours spent on that Nokia 3310.
            My love for games started here, and it's still here.
          </p>
        </div>
      )}

      {/* Game UI */}
      {gameStatus !== "intro" && (
        <>
          <div className="flex gap-8 text-text">
            <div className="text-center">
              <div className="text-sm text-text-secondary mb-1">Score</div>
              <div className="text-xl font-bold text-accent">{score}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-text-secondary mb-1">High Score</div>
              <div className="text-xl font-bold text-accent">{highScore}</div>
            </div>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              className="border-2 border-border rounded-lg bg-black shadow-lg"
            />

            {gameStatus !== "playing" && (
              <div className="absolute inset-0 glass-heavy flex items-center justify-center rounded-lg">
                {gameStatus === "idle" && (
                  <button
                    onClick={startGame}
                    className="px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all">
                    Start Game
                  </button>
                )}

                {gameStatus === "paused" && (
                  <button
                    onClick={() => setGameStatus("playing")}
                    className="px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all">
                    Resume
                  </button>
                )}

                {gameStatus === "gameOver" && (
                  <div className="text-center space-y-4">
                    <div className="text-3xl font-bold text-text">
                      Game Over!
                    </div>
                    <div className="text-text-secondary">Score: {score}</div>
                    {score === highScore && score > 0 && (
                      <div className="text-accent font-semibold">
                        New High Score!
                      </div>
                    )}
                    <button
                      onClick={startGame}
                      className="px-8 py-4 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all">
                      Play Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-text-secondary text-center space-y-1">
            <div>Arrow Keys or WASD to move • Space to pause</div>
          </div>
        </>
      )}
    </div>
  );
}
