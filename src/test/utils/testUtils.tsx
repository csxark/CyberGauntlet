import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Custom render function that includes common providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data helpers
export const mockTeam = {
  id: 'TestTeam',
  teamName: 'TestTeam',
  leaderName: 'Test Leader',
};

export const mockChallenge = {
  id: 'q1',
  title: 'Test Challenge',
  description: 'Test description',
  file_name: 'test.txt',
  file_path: '/test/test.txt',
  correct_flag: 'TEST{flag}',
  hints: ['Hint 1', 'Hint 2'],
};

export const mockLocalStorage = () => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};
