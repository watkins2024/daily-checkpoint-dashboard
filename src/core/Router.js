/**
 * Simple client-side router for SPA navigation
 */
export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.params = {};
    this.beforeHooks = [];
    this.afterHooks = [];
  }

  register(path, handler) {
    this.routes.set(path, handler);
    return this;
  }

  beforeEach(hook) {
    this.beforeHooks.push(hook);
    return this;
  }

  afterEach(hook) {
    this.afterHooks.push(hook);
    return this;
  }

  async navigate(path, replace = false) {
    const route = this.matchRoute(path);
    if (!route) {
      console.warn(`No route found for: ${path}`);
      return;
    }

    // Run before hooks
    for (const hook of this.beforeHooks) {
      const result = await hook(path, this.currentRoute);
      if (result === false) return; // Navigation cancelled
    }

    // Execute route handler
    this.currentRoute = path;
    await route.handler(route.params);

    // Update browser history
    if (replace) {
      window.history.replaceState({ path }, '', path);
    } else {
      window.history.pushState({ path }, '', path);
    }

    // Run after hooks
    for (const hook of this.afterHooks) {
      await hook(path);
    }
  }

  matchRoute(path) {
    // Try exact match first
    if (this.routes.has(path)) {
      return { handler: this.routes.get(path), params: {} };
    }

    // Try pattern matching
    for (const [pattern, handler] of this.routes.entries()) {
      const regex = this.pathToRegex(pattern);
      const match = path.match(regex);
      if (match) {
        const params = this.extractParams(pattern, match);
        return { handler, params };
      }
    }

    return null;
  }

  pathToRegex(path) {
    const pattern = path
      .replace(/:[^\s/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    return new RegExp(`^${pattern}$`);
  }

  extractParams(pattern, match) {
    const keys = pattern.match(/:[^\s/]+/g) || [];
    const params = {};
    keys.forEach((key, index) => {
      params[key.slice(1)] = match[index + 1];
    });
    return params;
  }

  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      const path = e.state?.path || window.location.pathname;
      this.navigate(path, true);
    });

    // Intercept link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });

    // Navigate to current path
    const currentPath = window.location.pathname;
    this.navigate(currentPath, true);
  }

  link(href, text, className = '') {
    return `<a href="${href}" data-route class="${className}">${text}</a>`;
  }
}
