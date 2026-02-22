import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('./components/InputList', () => () => <div data-testid="input-list" />);
jest.mock('./components/FactList', () => () => <div data-testid="fact-list" />);
jest.mock('./components/InsightList', () => () => <div data-testid="insight-list" />);
jest.mock('./components/RecommendationList', () => () => <div data-testid="recommendation-list" />);
jest.mock('./components/OutputList', () => () => <div data-testid="output-list" />);
jest.mock('./components/Toolbar', () => () => <div data-testid="toolbar" />);
jest.mock('./components/Toast', () => () => null);
jest.mock('./components/DiscoveryModal', () => () => null);
jest.mock('./components/TraceabilityModal', () => () => null);
jest.mock('./components/GuidedTour', () => () => null);
jest.mock('./components/Modal', () => () => null);
jest.mock('./components/ChatWidget', () => () => null);
jest.mock('./components/Lines', () => ({
  useCalculateAndDrawLines: () => () => undefined,
}));
jest.mock('./lib', () => ({
  handleMouseEnter: () => undefined,
  handleMouseLeave: () => undefined,
}));

import App from './App';

describe('App room invite bootstrap', () => {
  const originalFetch = global.fetch;
  const originalResizeObserver = (global as any).ResizeObserver;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    (global as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (global as any).ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  test('does not show the welcome screen while bootstrapping a room from the URL on first use', () => {
    // @fsid:FS-JoinRoomViaInviteFirstUse
    window.history.pushState({}, '', '/?room=room-123');

    const pendingRoomFetch = new Promise<any>(() => {});
    const pendingStatusFetch = new Promise<any>(() => {});
    global.fetch = jest.fn((input: any) => {
      const url = String(input);

      if (url.endsWith('/status')) {
        return pendingStatusFetch;
      }

      if (url.includes('/rooms/room-123')) {
        return pendingRoomFetch;
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }) as any;

    render(<App />);

    expect(screen.getByText(/joining room/i)).toBeInTheDocument();
    expect(screen.queryByText(/new discovery/i)).not.toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/rooms/room-123'))).toBe(true);
  });

  test('loads the room in React StrictMode without getting stuck on joining', async () => {
    // @fsid:FS-JoinRoomViaInviteFirstUse
    window.history.pushState({}, '', '/?room=room-123');

    const roomDiscovery = {
      discovery_id: 'd-1',
      title: 'Joined Room',
      goal: 'Test goal',
      date: '2026-02-22',
      inputs: [],
      facts: [],
      insights: [],
      recommendations: [],
      outputs: [],
    };

    global.fetch = jest.fn((input: any) => {
      const url = String(input);

      if (url.endsWith('/status')) {
        return Promise.resolve({ ok: true });
      }

      if (url.includes('/rooms/room-123')) {
        return Promise.resolve({
          ok: true,
          json: async () => roomDiscovery,
        });
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }) as any;

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    expect(screen.getByText(/joining room/i)).toBeInTheDocument();
    expect(await screen.findByText(/joined room/i)).toBeInTheDocument();
    expect(screen.queryByText(/joining room/i)).not.toBeInTheDocument();
  });
});
