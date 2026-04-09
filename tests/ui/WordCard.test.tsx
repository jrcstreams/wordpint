import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordCard } from '../../src/ui/WordCard';

describe('WordCard', () => {
  it('shows the empty state when no current word', () => {
    render(
      <WordCard
        currentWord={null}
        onNext={() => {}}
        onUseWord={() => {}}
      />,
    );
    expect(screen.getByText(/no words yet/i)).toBeInTheDocument();
  });

  it('shows the word and definition when present', () => {
    render(
      <WordCard
        currentWord={{ word: 'cat', definition: 'a small feline' }}
        onNext={() => {}}
        onUseWord={() => {}}
      />,
    );
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('a small feline')).toBeInTheDocument();
  });

  it('calls onNext when Next is clicked', async () => {
    const onNext = vi.fn();
    render(
      <WordCard
        currentWord={{ word: 'cat', definition: 'a small feline' }}
        onNext={onNext}
        onUseWord={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls onUseWord with the current word', async () => {
    const onUseWord = vi.fn();
    render(
      <WordCard
        currentWord={{ word: 'cat', definition: 'a small feline' }}
        onNext={() => {}}
        onUseWord={onUseWord}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /use word/i }));
    expect(onUseWord).toHaveBeenCalledWith('cat');
  });
});
