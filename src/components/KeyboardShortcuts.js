/**
 * Keyboard shortcuts manager
 */
export class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      // Ignore if user is typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        // Allow Escape to blur
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      const key = this.getKeyCombo(e);
      if (this.shortcuts.has(key)) {
        e.preventDefault();
        const handler = this.shortcuts.get(key);
        handler.callback(e);
      }
    });
  }

  getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }

  register(keys, description, callback) {
    const key = typeof keys === 'string' ? keys : keys.join('+');
    this.shortcuts.set(key, { description, callback });
    return this;
  }

  unregister(keys) {
    const key = typeof keys === 'string' ? keys : keys.join('+');
    this.shortcuts.delete(key);
    return this;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  getAll() {
    return Array.from(this.shortcuts.entries()).map(([key, data]) => ({
      key,
      description: data.description,
    }));
  }

  showHelp() {
    const shortcuts = this.getAll();
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #2a2a2a;
      padding: 30px;
      border-radius: 12px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      color: #e0e0e0;
    `;

    content.innerHTML = `
      <h2 style="margin: 0 0 20px; font-family: 'Rajdhani', sans-serif;">Keyboard Shortcuts</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${shortcuts.map(({ key, description }) => `
          <tr style="border-bottom: 1px solid #444;">
            <td style="padding: 12px 20px 12px 0; font-family: monospace; color: #4a9eff;">
              ${key.toUpperCase().replace(/\+/g, ' + ')}
            </td>
            <td style="padding: 12px 0;">${description}</td>
          </tr>
        `).join('')}
      </table>
      <button style="margin-top: 20px; background: #4a9eff; border: none; padding: 10px 20px; border-radius: 6px; color: white; cursor: pointer; width: 100%;">
        Close
      </button>
    `;

    const closeBtn = content.querySelector('button');
    closeBtn.onclick = () => document.body.removeChild(modal);

    modal.onclick = (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    };

    modal.appendChild(content);
    document.body.appendChild(modal);
  }
}

export const shortcuts = new KeyboardShortcuts();

// Register default shortcuts
shortcuts
  .register('?', 'Show keyboard shortcuts', () => shortcuts.showHelp())
  .register('ctrl+/', 'Toggle search', () => window.dispatchEvent(new CustomEvent('toggle-search')))
  .register('escape', 'Close modal/dialog', () => window.dispatchEvent(new CustomEvent('close-modal')));
