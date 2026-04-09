import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DictionaryBanner } from '../../src/ui/DictionaryBanner';

describe('DictionaryBanner', () => {
  it('renders nothing when status is ready', () => {
    const { container } = render(
      <DictionaryBanner status="ready" onRetry={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when status is loading or idle', () => {
    const { container: c1 } = render(
      <DictionaryBanner status="loading" onRetry={() => {}} />,
    );
    expect(c1).toBeEmptyDOMElement();
    const { container: c2 } = render(
      <DictionaryBanner status="idle" onRetry={() => {}} />,
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('shows the error message and a retry button when status is error', () => {
    render(<DictionaryBanner status="error" onRetry={() => {}} />);
    expect(screen.getByText(/couldn't load dictionary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry is clicked', async () => {
    const onRetry = vi.fn();
    render(<DictionaryBanner status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
