import './styles.css';

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

async function render(): Promise<void> {
  cleanup?.();
  cleanup = undefined;

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
  if (page === 'sprites') {
    const { mountSpritePreview } = await import('./spritePreview');
    cleanup = mountSpritePreview(pageRoot);
    return;
  }

  const { mountGame } = await import('./game');
  cleanup = mountGame(pageRoot);
}

window.addEventListener('hashchange', () => void render());
void render();
