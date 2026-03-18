import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render the app title', () => {
    render(<App />);
    expect(screen.getByText('InsightU Platform')).toBeDefined();
  });

  it('should render the app description', () => {
    render(<App />);
    expect(screen.getByText(/Academic platform for students/i)).toBeDefined();
  });
});
