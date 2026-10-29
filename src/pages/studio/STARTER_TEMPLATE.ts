/** Starter source shown when a new Arcade Studio project is created. */
export const STARTER_TEMPLATE = `import type { FlushArcadeApi } from 'flush';

/**
 * My First Arcade
 * A minimal game shell: draws a canvas, asks a question, checks the answer.
 * Change anything - Run previews it instantly.
 */
export default class MyArcade {
  private api!: FlushArcadeApi;
  private ctx!: CanvasRenderingContext2D;
  private question = { front: '', back: '', notes: '' };
  private score = 0;
  private running = false;

  init(api: FlushArcadeApi): void {
    this.api = api;
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('click', () => this.checkAnswer());
  }

  async start(): Promise<void> {
    this.running = true;
    await this.nextQuestion();
  }

  private async nextQuestion(): Promise<void> {
    this.question = await this.api.getQuestion();
    this.render('Guess the answer!');
  }

  private checkAnswer(): void {
    const guess = window.prompt('Your answer') ?? '';
    const correct = guess.trim().toLowerCase() === this.question.back.trim().toLowerCase();
    this.api.submitAnswer(correct);
    if (correct) this.score += 10;
    this.api.submitScore(this.score);
    if (this.running) void this.nextQuestion();
  }

  private render(label: string): void {
    const { width, height } = this.ctx.canvas;
    this.ctx.fillStyle = '#1E1E2E';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.fillStyle = '#B026FF';
    this.ctx.font = 'bold 22px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, width / 2, height / 2 - 20);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px sans-serif';
    this.wrap(this.question.front, width / 2, height / 2 + 20, width - 80);
  }

  private wrap(text: string, x: number, y: number, maxWidth: number): void {
    for (const line of this.wrapLines(text, maxWidth)) {
      this.ctx.fillText(line, x, y);
      y += 24;
    }
  }

  private wrapLines(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const attempt = current ? current + ' ' + word : word;
      if (this.ctx.measureText(attempt).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = attempt;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
`;
