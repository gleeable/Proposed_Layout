import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('shows the building setup form before a building exists', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '건물 생성' })).toBeDefined();
});
