import { useEffect, useRef } from 'react';
import { Game } from './game/Game';
import { Hud } from './ui/Hud';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const game = new Game(canvasRef.current!);
    void game.init();
    return () => game.dispose();
  }, []);

  return (
    <div className="stage">
      <canvas ref={canvasRef} className="stage__canvas" />
      <Hud />
    </div>
  );
}
