const THINKING_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const FRAME_INTERVAL_MS = 80;

export function formatThinkingIndicator(frameIndex: number): string {
  const frame = THINKING_FRAMES[frameIndex % THINKING_FRAMES.length] ?? THINKING_FRAMES[0];
  return `\x1b[2m${frame} Thinking\x1b[0m`;
}

export class ThinkingIndicator {
  private active = false;
  private frame = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.active) {
      return;
    }

    this.active = true;
    this.frame = 0;
    process.stdout.write("\x1b[?25l\n");
    this.render();
    this.timer = setInterval(() => {
      this.frame += 1;
      this.render();
    }, FRAME_INTERVAL_MS);
  }

  stop(): void {
    if (!this.active) {
      return;
    }

    this.active = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    process.stdout.write("\r\x1b[K");
  }

  private render(): void {
    process.stdout.write(`\r\x1b[K${formatThinkingIndicator(this.frame)}`);
  }
}
