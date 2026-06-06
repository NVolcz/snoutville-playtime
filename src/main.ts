import './styles.css';
import { mountGame } from './game';
import { mountSpritePreview } from './spritePreview';

type Page = 'game' | 'sprites';

let cleanup: (() => void) | undefined;

const appElement = document.querySelector<HTMLElement>('#app');
if (!appElement) {
  throw new Error('Missing #app root element');
}

const app = appElement;

function getCurrentPage(): Page {
  return window.location.pathname === '/dev/sprites' || window.location.hash === '#sprites' ? 'sprites' : 'game';
}

function render(): void {
  cleanup?.();

  const page = getCurrentPage();

  if (page === 'sprites') {
    app.innerHTML = `
      <header class="app-header dev-only-header">
        <div>
          <h1>Sprite Preview</h1>
          <p>Developer-only sprite and animation review</p>
        </div>
      </header>
      <main id="page-root" class="page-root"></main>
    `;
  } else {
    app.innerHTML = '<main id="page-root" class="game-root"></main>';
  }

  const pageRoot = document.querySelector<HTMLElement>('#page-root')!;
  cleanup = page === 'sprites' ? mountSpritePreview(pageRoot) : mountGame(pageRoot);
}

window.addEventListener('hashchange', render);
render();
