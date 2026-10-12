import '@testing-library/jest-dom';

// Standard Ant Design matchMedia mock for JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches:
      query.includes('min-width: 768px') ||
      query.includes('min-width: 992px') ||
      query.includes('min-width: 576px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Standard ResizeObserver mock for JSDOM
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;
