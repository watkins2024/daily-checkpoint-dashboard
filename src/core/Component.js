/**
 * Base Component class for building reactive UI components
 */
export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.el = null;
    this.mounted = false;
    this._eventListeners = [];
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this.mounted) {
      this.render();
    }
  }

  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this._eventListeners.push({ element, event, handler, options });
  }

  removeAllListeners() {
    this._eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this._eventListeners = [];
  }

  mount(container) {
    this.container = container;
    this.beforeMount();
    const html = this.template();
    if (typeof html === 'string') {
      container.innerHTML = html;
      this.el = container.firstElementChild || container;
    } else {
      container.appendChild(html);
      this.el = html;
    }
    this.afterMount();
    this.mounted = true;
    return this;
  }

  render() {
    if (!this.container) return;
    this.beforeRender();
    this.removeAllListeners();
    const html = this.template();
    if (typeof html === 'string') {
      this.container.innerHTML = html;
      this.el = this.container.firstElementChild || this.container;
    } else {
      this.container.innerHTML = '';
      this.container.appendChild(html);
      this.el = html;
    }
    this.afterRender();
  }

  unmount() {
    this.beforeUnmount();
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.mounted = false;
  }

  // Lifecycle hooks
  beforeMount() {}
  afterMount() {}
  beforeRender() {}
  afterRender() {}
  beforeUnmount() {}

  // Must be implemented by subclasses
  template() {
    return '<div>Override template() method</div>';
  }
}
