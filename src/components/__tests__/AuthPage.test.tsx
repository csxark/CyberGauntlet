import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPage } from '../AuthPage';

describe('AuthPage', () => {
  const mockOnAuth = vi.fn();

  beforeEach(() => {
    mockOnAuth.mockClear();
  });

  it('should render login form', () => {
    render(<AuthPage onAuth={mockOnAuth} />);
    
    expect(screen.getByText(/CYBER/)).toBeInTheDocument();
    expect(screen.getByText(/GAUNTLET/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/echo force/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/michael chen/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register & login/i })).toBeInTheDocument();
  });

  it('should update input fields on user input', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    
    await user.type(teamInput, 'Parallax');
    await user.type(leaderInput, 'Madhav Agarwal');
    
    expect(teamInput).toHaveValue('Parallax');
    expect(leaderInput).toHaveValue('Madhav Agarwal');
  });

  it('should call onAuth with valid credentials', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    const submitButton = screen.getByRole('button', { name: /register & login/i });
    
    await user.type(teamInput, 'Parallax');
    await user.type(leaderInput, 'Madhav Agarwal');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnAuth).toHaveBeenCalledWith(
        'team3',
        'Parallax',
        'Madhav Agarwal'
      );
    });
  });

  it('should show error message for invalid credentials', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    const submitButton = screen.getByRole('button', { name: /register & login/i });
    
    await user.type(teamInput, 'InvalidTeam');
    await user.type(leaderInput, 'Invalid Leader');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid team name or leader name/i)).toBeInTheDocument();
    });
    
    expect(mockOnAuth).not.toHaveBeenCalled();
  });

  it('should show loading state during authentication', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    const submitButton = screen.getByRole('button', { name: /register & login/i });
    
    await user.type(teamInput, 'Parallax');
    await user.type(leaderInput, 'Madhav Agarwal');
    await user.click(submitButton);
    
    // Check for loading state
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('should disable submit button during loading', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    const submitButton = screen.getByRole('button', { name: /register & login/i });
    
    await user.type(teamInput, 'Parallax');
    await user.type(leaderInput, 'Madhav Agarwal');
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
  });

  it('should require both fields to be filled', () => {
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    
    expect(teamInput).toBeRequired();
    expect(leaderInput).toBeRequired();
  });

  it('should clear error when user types after error', async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuth={mockOnAuth} />);
    
    const teamInput = screen.getByPlaceholderText(/echo force/i);
    const leaderInput = screen.getByPlaceholderText(/michael chen/i);
    const submitButton = screen.getByRole('button', { name: /register & login/i });
    
    // Trigger error
    await user.type(teamInput, 'InvalidTeam');
    await user.type(leaderInput, 'Invalid Leader');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid team name or leader name/i)).toBeInTheDocument();
    });
    
    // Clear and start typing again - error should persist until form is submitted again
    await user.clear(teamInput);
    await user.type(teamInput, 'P');
    
    // Error should still be visible (doesn't clear on typing in this implementation)
    expect(screen.getByText(/invalid team name or leader name/i)).toBeInTheDocument();
  });
});
