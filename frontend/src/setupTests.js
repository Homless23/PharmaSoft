import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

if (typeof global !== 'undefined' && !global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (typeof global !== 'undefined' && !global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

if (typeof global !== 'undefined' && !global.MessageChannel) {
  try {
    // Prefer the native Node implementation to avoid timer-loop leaks.
    // eslint-disable-next-line global-require
    const { MessageChannel } = require('worker_threads');
    global.MessageChannel = MessageChannel;
  } catch (_error) {
    class MessageChannelMock {
      constructor() {
        this.port1 = { onmessage: null };
        this.port2 = {
          postMessage: () => {
            setTimeout(() => {
              if (typeof this.port1.onmessage === 'function') {
                this.port1.onmessage({ data: undefined });
              }
            }, 0);
          }
        };
      }
    }
    global.MessageChannel = MessageChannelMock;
  }
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
  global.ResizeObserver = ResizeObserverMock;
}
