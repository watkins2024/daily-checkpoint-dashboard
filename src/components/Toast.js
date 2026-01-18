/**
 * Toast notification system
 */
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    document.body.appendChild(this.container);
  }

  show(message, options = {}) {
    const {
      type = 'info', // info, success, warning, error
      duration = 4000,
      action = null,
    } = options;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: ${this.getTextColor(type)};
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid ${this.getBorderColor(type)};
    `;

    const icon = this.getIcon(type);
    const content = document.createElement('div');
    content.style.flex = '1';
    content.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.6;
    `;
    closeBtn.onclick = () => this.remove(toast);

    toast.appendChild(document.createTextNode(icon + ' '));
    toast.appendChild(content);

    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = action.label;
      actionBtn.style.cssText = `
        background: rgba(255,255,255,0.2);
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        color: inherit;
        font-size: 13px;
        font-weight: 600;
      `;
      actionBtn.onclick = () => {
        action.onClick();
        this.remove(toast);
      };
      toast.appendChild(actionBtn);
    }

    toast.appendChild(closeBtn);

    this.container.appendChild(toast);
    this.toasts.push(toast);

    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  remove(toast) {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  getBackgroundColor(type) {
    const colors = {
      info: '#2a4a6a',
      success: '#2a5a3a',
      warning: '#5a4a2a',
      error: '#5a2a2a',
    };
    return colors[type] || colors.info;
  }

  getTextColor(type) {
    return '#e8f7ff';
  }

  getBorderColor(type) {
    const colors = {
      info: '#4a9eff',
      success: '#6cf3b1',
      warning: '#ffb84a',
      error: '#ff6b6b',
    };
    return colors[type] || colors.info;
  }

  getIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✓',
      warning: '⚠️',
      error: '✕',
    };
    return icons[type] || icons.info;
  }

  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }
}

// Add animations to document
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

export const toast = new ToastManager();
