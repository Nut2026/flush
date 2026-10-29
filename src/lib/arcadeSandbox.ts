/**
 * Arcade sandbox bridge.
 *
 * Community arcade games run inside a sandboxed iframe with no network,
 * storage, or reward access. A game exposes exactly two hooks — `init(api)`
 * and `start()` — and talks to the host through the small FlushAPI bridge
 * below. The host (Arcade Studio preview or the Games page) owns the flashcard
 * data and all reward logic; the game only reports answers and a final score.
 */

export interface ArcadeCard {
  front: string;
  back: string;
  notes: string;
}

/** API handed to a game inside the sandbox. */
export interface FlushArcadeApi {
  /** Returns the next flashcard to build a question from. */
  getQuestion(): Promise<ArcadeCard>;
  /** Report whether the player answered correctly (host tracks progress). */
  submitAnswer(correct: boolean): void;
  /** Report the final score when the game ends. */
  submitScore(score: number): void;
  /** Best-effort debug logging, surfaced as toasts in the host. */
  log(message: string): void;
  /** Object URLs for the game's uploaded assets, keyed by file name. */
  assets: Record<string, string>;
}

/** Contract every community arcade must implement. */
export interface FlushArcadeGame {
  init(api: FlushArcadeApi): void;
  start(): void;
}

/** Sandbox viewport; host pages size the iframe to this aspect ratio. */
export const SANDBOX_WIDTH = 800;
export const SANDBOX_HEIGHT = 560;

interface SandboxAsset {
  name: string;
  /** Base64 data URI — decoded into a blob URL inside the sandbox. */
  dataUrl?: string;
}

/**
 * Strip TypeScript-only syntax from a game's source before evaluation.
 * Transpilation via the real TypeScript compiler happens in the Studio;
 * this pass is a final safety net for hand-edited sources.
 */
export function stripTypes(tsSource: string): string {
  return tsSource
    .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
    .replace(/:\s*(string|number|boolean|void|null|undefined|any|FlushAPI|FlushArcadeGame|CanvasRenderingContext2D|HTMLCanvasElement|MouseEvent|Promise<[^>]+>|\w+\[\])/g, '')
    .replace(/<[A-Z][^>]*>/g, '')
    .replace(/export\s+default\s+(\w+);?/, '\nconst exports={default:$1};')
    .replace(/^import\s.*$/gm, '');
}

/**
 * Build the sandbox document for a transpiled game. The compiled script is
 * interpolated into a strict IIFE that installs the blocklist, the bridge and
 * a watchdog before constructing the game's default export.
 */
export function buildSandboxHtml(opts: {
  js: string;
  assets?: SandboxAsset[];
}): string {
  const assets = JSON.stringify(
    Object.fromEntries((opts.assets ?? []).filter(a => a.dataUrl).map(a => [a.name, a.dataUrl!])),
  );

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#1E1E2E;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}#game-canvas{display:block;}</style>
</head><body>
<canvas id="game-canvas" width="${SANDBOX_WIDTH}" height="${SANDBOX_HEIGHT}" tabindex="0"></canvas>
<script>
(function(){
  'use strict';
  const BLOCKED=['fetch','XMLHttpRequest','WebSocket','indexedDB','localStorage','sessionStorage'];
  BLOCKED.forEach(k=>{try{Object.defineProperty(window,k,{get(){throw new Error('Flush Sandbox: '+k+' blocked')}})}catch(_){}});
  let port2=null,pendingResolve=null;
  const rawAssets=${JSON.stringify(assets)};
  const ASSETS={};
  for(const name in rawAssets){
    const bin=atob(String(rawAssets[name]).split(',')[1]);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    ASSETS[name]=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
  }
  const flushApi={
    getQuestion(){return new Promise(r=>{pendingResolve=r;port2.postMessage({type:'GET_QUESTION'});})},
    submitAnswer(c){port2.postMessage({type:'ANSWER',correct:c});return Promise.resolve();},
    submitScore(s){port2.postMessage({type:'SCORE',score:s});return Promise.resolve();},
    log(m){port2.postMessage({type:'LOG',message:String(m)});},
    assets:ASSETS
  };
  window.addEventListener('message',ev=>{
    if(ev.data?.type==='INIT_PORT'){
      port2=ev.ports[0];
      port2.onmessage=me=>{
        if(me.data?.type==='QUESTION'&&pendingResolve){const r=pendingResolve;pendingResolve=null;r(me.data.card);}
        if(me.data?.type==='TERMINATE'){port2.close();}
      };
      try{startGame();}catch(e){port2.postMessage({type:'ERROR',message:String(e)});}
    }
  });
  let lastYield=Date.now();
  const origRAF=requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>{lastYield=Date.now();return origRAF(cb);};
  setInterval(()=>{if(Date.now()-lastYield>5000){document.body.innerHTML='<div style="color:#ff6b6b;padding:20px;font-family:sans-serif;">Game stopped: no activity for 5 seconds.</div>';if(port2)port2.postMessage({type:'ERROR',message:'Loop detected.'});}},500);
  function startGame(){
    ${opts.js}
    const GameClass=typeof exports!=='undefined'&&exports.default?exports.default:(typeof MyArcade!=='undefined'?MyArcade:null);
    if(!GameClass)throw new Error('No default export found.');
    const g=new GameClass();g.init(flushApi);g.start();
  }
})();
<\\/script></body></html>`;
}
