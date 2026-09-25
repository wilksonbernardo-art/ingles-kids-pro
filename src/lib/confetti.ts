import confetti from 'canvas-confetti';

export function celebrate(): void {
  const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
  });
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
  }, 200);
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
  }, 400);
}
