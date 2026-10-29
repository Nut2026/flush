/** Line-by-line tutorial notes shown under the Studio editor. */
export interface TutorialStep {
  line: number;
  comment: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { line: 1, comment: 'Import the Flush API type — the only contract your game has with the host.' },
  { line: 9, comment: 'init() runs once; grab the canvas so you can draw.' },
  { line: 13, comment: 'start() is called after init — kick off your game loop here.' },
  { line: 17, comment: 'getQuestion() returns the next flashcard: { front, back, notes }.' },
  { line: 26, comment: 'submitAnswer(correct) reports the answer; the host tracks progress and rewards.' },
  { line: 27, comment: 'submitScore(n) fires the game-over state in the host.' },
  { line: 38, comment: 'Draw with plain canvas calls — no Tailwind or React inside the sandbox.' },
  { line: 60, comment: 'Word-wrap keeps long card fronts readable on the 800×560 canvas.' },
];
