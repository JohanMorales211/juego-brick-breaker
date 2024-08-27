import React, { useState, useEffect, useRef } from "react";

// Interfaz para los ladrillos
interface Brick {
  x: number;
  y: number;
  status: boolean;
  color: string;
}

// Interfaz para la pelota
interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

// Interfaz para la plataforma
interface Paddle {
  x: number;
  width: number;
  height: number;
}

const BrickBreaker: React.FC = () => {
  // Estado para el ancho y alto del canvas
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight * 0.6);

  // Ajustar altura y ancho de la plataforma para pantallas pequeñas
  const paddleHeight = canvasWidth > 400 ? 10 : 7;
  const paddleWidth = canvasWidth * (canvasWidth > 400 ? 0.2 : 0.3);

  // Estado inicial de la pelota
  const ballInitialState: Ball = {
    x: canvasWidth / 2,
    y: canvasHeight - 30,
    dx: canvasWidth * 0.005,
    dy: -canvasWidth * 0.005,
    radius: canvasWidth * 0.02,
  };

  // Estado inicial de la plataforma
  const paddleInitialState: Paddle = {
    x: (canvasWidth - paddleWidth) / 2,
    width: paddleWidth,
    height: paddleHeight,
  };

  // Estados del juego
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [ball, setBall] = useState<Ball>(ballInitialState);
  const [paddle, setPaddle] = useState<Paddle>(paddleInitialState);
  const [rightPressed, setRightPressed] = useState(false);
  const [leftPressed, setLeftPressed] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [difficulty, setDifficulty] = useState<
    "facil" | "intermedio" | "dificil"
  >("facil");
  const [brickType, setBrickType] = useState<"tipo1" | "tipo2" | "tipo3">(
    "tipo1"
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [resetBricks, setResetBricks] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [youWin, setYouWin] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Estado para el modo oscuro

  // Efecto para detectar el tamaño de la pantalla y ajustar el canvas y la plataforma
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight * 0.6);
      setPaddle((prevPaddle) => ({
        ...prevPaddle,
        width: canvasWidth * (canvasWidth > 400 ? 0.2 : 0.3),
        height: canvasWidth > 400 ? 10 : 7,
        x: (canvasWidth - canvasWidth * (canvasWidth > 400 ? 0.2 : 0.3)) / 2,
      }));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [canvasWidth]);

  // Efecto para detectar cuando el juego termina por perder todas las vidas
  useEffect(() => {
    if (lives === 0 && !gameEnded) {
      setGameEnded(true);
      handleGameOver();
    }
  }, [lives, gameEnded]);

  // Efecto para reiniciar los ladrillos cuando se cambia la dificultad o el tipo de ladrillo
  useEffect(() => {
    if (resetBricks) {
      initializeBricks();
      setResetBricks(false);
    }
  }, [resetBricks, difficulty, brickType, canvasWidth]);

  // Efecto para controlar el juego (movimiento de la plataforma, pelota, colisiones, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        setRightPressed(true);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        setLeftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        setRightPressed(false);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        setLeftPressed(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX;
      if (touchX < canvasWidth / 2) {
        setLeftPressed(true);
        setRightPressed(false);
      } else {
        setRightPressed(true);
        setLeftPressed(false);
      }
    };

    const handleTouchEnd = () => {
      setLeftPressed(false);
      setRightPressed(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchX = e.touches[0].clientX;
      setPaddle((prevPaddle) => ({
        ...prevPaddle,
        x: touchX - paddleWidth / 2,
      }));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    let gameLoop: NodeJS.Timeout;

    if (gameStarted && !gameOver) {
      gameLoop = setInterval(() => {
        draw();
        collisionDetection();
        movePaddle();
        moveBall();
      }, 10);
    }

    return () => {
      clearInterval(gameLoop);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
    };
  }, [
    gameStarted,
    gameOver,
    ball,
    paddle,
    bricks,
    rightPressed,
    leftPressed,
    score,
    lives,
    flashing,
    difficulty,
    canvasWidth,
    paddleWidth,
  ]);

  // Inicializa los ladrillos al comienzo del juego o al cambiar la dificultad
  const initializeBricks = () => {
    let brickRowCountLocal = 3;
    let brickColumnCountLocal = Math.floor(canvasWidth / 85);
    let ballSpeed = canvasWidth * 0.005;
    let brickWidth = 75;
    let brickHeight = 20;
    let brickPadding = 10;
    let brickOffsetTop = 30;
    let brickOffsetLeft =
      (canvasWidth - brickColumnCountLocal * (brickWidth + brickPadding)) / 2;

    if (difficulty === "intermedio") {
      brickRowCountLocal = 4;
      brickColumnCountLocal = Math.floor(canvasWidth / 70);
      ballSpeed = canvasWidth * 0.007;
      brickWidth = 60;
    } else if (difficulty === "dificil") {
      brickRowCountLocal = 5;
      brickColumnCountLocal = Math.floor(canvasWidth / 55);
      ballSpeed = canvasWidth * 0.009;
      brickWidth = 45;
    }

    setBall({
      ...ballInitialState,
      dx: ballSpeed,
      dy: -ballSpeed,
    });

    const newBricks: Brick[] = [];
    for (let c = 0; c < brickColumnCountLocal; c++) {
      for (let r = 0; r < brickRowCountLocal; r++) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        let color = "#0095DD";

        if (brickType === "tipo2") {
          color = (c + r) % 2 === 0 ? "#0095DD" : "#FFA500";
        } else if (brickType === "tipo3") {
          color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        }

        newBricks.push({
          x: brickX,
          y: brickY,
          status: true,
          color: color,
        });
      }
    }
    setBricks(newBricks);
  };

  // Dibuja todos los elementos del juego en el canvas
  const draw = () => {
    const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    let brickWidth = 75;
    let brickHeight = 20;

    if (difficulty === "intermedio") {
      brickWidth = 60;
    } else if (difficulty === "dificil") {
      brickWidth = 45;
    }

    drawBricks(ctx, brickWidth, brickHeight);
    drawBall(ctx);
    drawPaddle(ctx);
    drawScore(ctx);
    drawLives(ctx);
    drawDifficulty(ctx);
  };

  // Dibuja los ladrillos
  const drawBricks = (
    ctx: CanvasRenderingContext2D,
    brickWidth: number,
    brickHeight: number
  ) => {
    bricks.forEach((brick) => {
      if (brick.status) {
        ctx.beginPath();
        ctx.rect(brick.x, brick.y, brickWidth, brickHeight);
        ctx.fillStyle = flashing ? "red" : brick.color;
        ctx.fill();
        ctx.closePath();
      }
    });
  };

  // Dibuja la pelota
  const drawBall = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = flashing ? "red" : "#0095DD";
    ctx.fill();
    ctx.closePath();
  };

  // Dibuja la plataforma
  const drawPaddle = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.rect(
      paddle.x,
      canvasHeight - paddle.height,
      paddle.width,
      paddle.height
    );
    ctx.fillStyle = flashing ? "red" : "#0095DD";
    ctx.fill();
    ctx.closePath();
  };

  // Dibuja la puntuación
  const drawScore = (ctx: CanvasRenderingContext2D) => {
    ctx.font = "16px Arial";
    ctx.fillStyle = darkMode ? "white" : "#0095DD"; // Ajusta el color según el modo oscuro
    ctx.fillText(`Puntuación: ${score}`, 8, 20);
  };

  // Dibuja las vidas
  const drawLives = (ctx: CanvasRenderingContext2D) => {
    ctx.font = "16px Arial";
    ctx.fillStyle = darkMode ? "white" : "#0095DD"; // Ajusta el color según el modo oscuro
    ctx.fillText(`Vidas: ${lives}`, canvasWidth - 65, 20);
  };

  // Dibuja la dificultad
  const drawDifficulty = (ctx: CanvasRenderingContext2D) => {
    ctx.font = "16px Arial";
    ctx.fillStyle = darkMode ? "white" : "#0095DD"; // Ajusta el color según el modo oscuro
    ctx.fillText(`Dificultad: ${difficulty}`, canvasWidth / 2 - 60, 20);
  };

  // Detecta las colisiones entre la pelota y los ladrillos
  const collisionDetection = () => {
    let brickWidth = 75;

    if (difficulty === "intermedio") {
      brickWidth = 60;
    } else if (difficulty === "dificil") {
      brickWidth = 45;
    }

    bricks.forEach((b, index) => {
      if (b.status) {
        if (
          ball.x > b.x &&
          ball.x < b.x + brickWidth &&
          ball.y > b.y &&
          ball.y < b.y + 20
        ) {
          ball.dy = -ball.dy;
          b.status = false;
          setScore(score + 1);

          // Verificar si se han roto todos los bloques
          let allBricksBroken = true;
          bricks.forEach((b) => {
            if (b.status) {
              allBricksBroken = false;
            }
          });

          if (allBricksBroken) {
            setYouWin(true);
            handleGameOver();
          }
        }
      }
    });
  };

  // Mueve la plataforma (con mayor velocidad)
  const movePaddle = () => {
    const paddleSpeed = Math.abs(ball.dx) * 2; // Duplica la velocidad de la plataforma
    if (rightPressed && paddle.x < canvasWidth - paddle.width) {
      setPaddle((prevPaddle) => ({
        ...prevPaddle,
        x: prevPaddle.x + paddleSpeed,
      }));
    } else if (leftPressed && paddle.x > 0) {
      setPaddle((prevPaddle) => ({
        ...prevPaddle,
        x: prevPaddle.x - paddleSpeed,
      }));
    }
  };

  // Mueve la pelota y detecta colisiones con las paredes y la plataforma
  const moveBall = () => {
    if (gameEnded) return;

    setBall((prevBall) => {
      let newX = prevBall.x + prevBall.dx;
      let newY = prevBall.y + prevBall.dy;

      if (newX + prevBall.radius > canvasWidth || newX - prevBall.radius < 0) {
        newX = prevBall.x;
        prevBall.dx = -prevBall.dx;
      }

      if (newY - prevBall.radius < 0) {
        newY = prevBall.y;
        prevBall.dy = -prevBall.dy;
      } else if (newY + prevBall.radius > canvasHeight) {
        if (newX > paddle.x && newX < paddle.x + paddle.width) {
          newY = prevBall.y;
          prevBall.dy = -prevBall.dy;
        } else {
          setLives(lives - 1);
          setFlashing(true);
          setTimeout(() => setFlashing(false), 200);
          newX = canvasWidth / 2;
          newY = canvasHeight - 30;
          prevBall.dy = -Math.abs(prevBall.dy);
        }
      }

      return { ...prevBall, x: newX, y: newY };
    });
  };

  // Maneja el fin del juego
  const handleGameOver = () => {
    setGameOver(true);
    setFinalScore(score);
    if (canvasRef.current) {
      canvasRef.current.style.filter = "blur(5px)";
    }
  };

  // Inicia el juego
  const handleGameStart = () => {
    setGameStarted(true);
    setResetBricks(true);
  };

  // Reinicia el juego
  const handleRestartGame = () => {
    setGameOver(false);
    setGameStarted(false);
    setLives(3);
    setScore(0);
    setBall(ballInitialState);
    setPaddle(paddleInitialState);
    if (canvasRef.current) {
      canvasRef.current.style.filter = "none";
    }
    setGameEnded(false);
    setResetBricks(true);
    setYouWin(false);
  };

  // Maneja el cambio de dificultad
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDifficulty(e.target.value as "facil" | "intermedio" | "dificil");
  };

  // Maneja el cambio de tipo de ladrillo
  const handleBrickTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBrickType(e.target.value as "tipo1" | "tipo2" | "tipo3");
  };

  // Función para cambiar el modo oscuro
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-gray-900 text-white"
          : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
      }`}
    >
      <div className="container mx-auto p-4">
        {!gameStarted && (
          <div
            className={`bg-white dark:bg-gray-800 p-8 rounded shadow-md ${
              darkMode ? "text-white" : "text-gray-800"
            }`}
          >
            <div className="flex flex-col items-center">
              {" "}
              {/* Contenedor para centrar el título y la firma */}
              <h1 className="text-3xl font-bold text-center mb-4 text-blue-600 dark:text-blue-400">
                Brick Breaker
              </h1>
              <p className="text-sm text-black-500 dark:black-black-800">
                Creado por Johan Morales
              </p>{" "}
              {/* Firma debajo del título */}
            </div>
            <div className="flex flex-col mb-4">
              <label
                htmlFor="difficulty"
                className="mb-2 text-blue-600 dark:text-blue-400"
              >
                Dificultad:
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={handleDifficultyChange}
                className={`border border-gray-300 dark:border-gray-700 rounded px-2 py-1 ${
                  darkMode ? "bg-gray-800 text-white" : ""
                }`} // Ajusta el fondo y texto en modo oscuro
              >
                <option value="facil">Fácil</option>
                <option value="intermedio">Intermedio</option>
                <option value="dificil">Difícil</option>
              </select>
            </div>
            <div className="flex flex-col mb-4">
              <label
                htmlFor="brickType"
                className="mb-2 text-blue-600 dark:text-blue-400"
              >
                Tipo de Ladrillos:
              </label>
              <select
                id="brickType"
                value={brickType}
                onChange={handleBrickTypeChange}
                className={`border border-gray-300 dark:border-gray-700 rounded px-2 py-1 ${
                  darkMode ? "bg-gray-800 text-white" : ""
                }`} // Ajusta el fondo y texto en modo oscuro
              >
                <option value="tipo1">Tipo 1</option>
                <option value="tipo2">Tipo 2</option>
                <option value="tipo3">Tipo 3</option>
              </select>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
                  darkMode ? "dark:bg-blue-600 dark:hover:bg-blue-500" : ""
                }`}
                onClick={handleGameStart}
              >
                Jugar
              </button>
              <button
                className={`bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded ${
                  darkMode
                    ? "dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
                    : ""
                }`}
                onClick={toggleDarkMode}
              >
                {/* Ícono para modo oscuro */}
                {darkMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 inline-block"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 inline-block"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {gameStarted && !gameOver && (
          <div className="text-center mb-2 text-white dark:text-gray-300">
            {isMobile ? (
              <p>
                Mueve la plataforma deslizando el dedo. <br />
                (Recomendado: un deslizamiento por movimiento)
              </p>
            ) : (
              <p>Mueve la plataforma con las flechas izquierda y derecha.</p>
            )}
          </div>
        )}

        <canvas
          id="myCanvas"
          width={canvasWidth}
          height={canvasHeight}
          style={{
            background: darkMode ? "#2d3748" : "#eee",
            marginTop: "10px",
            maxWidth: "100%",
            borderRadius: "8px",
          }} // Ajusta el fondo según el modo oscuro
          ref={canvasRef}
        />
        {gameOver && (
          <div
            className={`fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-75 ${
              darkMode ? "text-white" : "text-gray-800"
            }`}
          >
            <div
              className={`bg-white dark:bg-gray-700 p-8 rounded shadow-md ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              <div className="mt-4 text-xl font-bold text-red-500 text-center dark:text-red-400">
                ¡Fin del juego!
              </div>
              <div className="mt-2 text-lg text-center">
                Puntuación final: {finalScore}
              </div>

              {youWin && (
                <div className="mt-2 text-xl font-bold text-green-500 text-center dark:text-green-400">
                  ¡Has ganado! <br /> Has roto todos los bloques.
                </div>
              )}

              <button
                className={`mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
                  darkMode ? "dark:bg-blue-600 dark:hover:bg-blue-500" : ""
                }`}
                onClick={handleRestartGame}
              >
                Volver a jugar
              </button>
              <div className="mt-4 text-sm text-gray-600 text-center dark:text-gray-400">
                Creado por Johan Morales
              </div>
            </div>
          </div>
        )}

        {gameStarted && !gameOver && (
          <div className="mt-4 text-sm text-gray-600 dark:white-white-400">
            Creado por Johan Morales
          </div>
        )}
      </div>
    </div>
  );
};

export default BrickBreaker;
