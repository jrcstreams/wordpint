import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ControlsBar } from '../../src/ui/ControlsBar';

describe('ControlsBar', () => {
  it('renders nothing when letter count is 0', () => {
    const { container } = render(
      <ControlsBar
        letterCount={0}
        dictionaryReady={true}
        onFindWord={() => {}}
        onToggleList={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the find-a-word button when there are letters and dictionary ready', () => {
    render(
      <ControlsBar
        letterCount={3}
        dictionaryReady={true}
        onFindWord={() => {}}
        onToggleList={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /find a word/i })).toBeEnabled();
  });

  it('shows loading state when dictionary is not ready', () => {
    render(
      <ControlsBar
        letterCount={3}
        dictionaryReady={false}
        onFindWord={() => {}}
        onToggleList={() => {}}
      />,
    );
    expect(screen.getByText(/loading dictionary/i)).toBeInTheDocument();
  });

  it('calls onFindWord when clicked', async () => {
    const onFindWord = vi.fn();
    render(
      <ControlsBar
        letterCount={3}
        dictionaryReady={true}
        onFindWord={onFindWord}
        onToggleList={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /find a word/i }));
    expect(onFindWord).toHaveBeenCalled();
  });
});
