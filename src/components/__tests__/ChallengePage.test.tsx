import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChallengePage } from '../ChallengePage'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock props
const mockProps = {
  teamId: 'test-team',
  teamName: 'Test Team',
  leaderName: 'Test Leader',
  onLogout: vi.fn()
}

describe('ChallengePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
  })

  it('renders challenge information correctly', async () => {
    render(<ChallengePage {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('CyberGauntlet')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Test Team')).toBeInTheDocument()
    expect(screen.getByText('Test Leader')).toBeInTheDocument()
  })

  it('handles flag submission correctly', async () => {
    const user = userEvent.setup()
    render(<ChallengePage {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter flag/i)).toBeInTheDocument()
    })
    
    const input = screen.getByPlaceholderText(/enter flag/i)
    const submitButton = screen.getByRole('button', { name: /verify flag/i })
    
    await user.type(input, 'CG{test_flag}')
    await user.click(submitButton)
    
    // Should show some feedback
    await waitFor(() => {
      expect(screen.getByText(/access/i)).toBeInTheDocument()
    })
  })

  it('tracks challenge progress in localStorage', async () => {
    render(<ChallengePage {...mockProps} />)
    
    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(`cybergauntlet_progress_${mockProps.teamId}`)
    })
  })

  it('shows leaderboard when button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChallengePage {...mockProps} />)
    
    const leaderboardButton = await screen.findByText(/show.*board/i)
    await user.click(leaderboardButton)
    
    expect(screen.getByText(/hide.*board/i)).toBeInTheDocument()
  })

  it('calls onLogout when exit button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChallengePage {...mockProps} />)
    
    const exitButton = await screen.findByText(/exit/i)
    await user.click(exitButton)
    
    expect(mockProps.onLogout).toHaveBeenCalled()
  })

  it('shows completion screen when all challenges are done', async () => {
    // Mock completed challenges
    mockLocalStorage.setItem(`cybergauntlet_completed_${mockProps.teamId}`, JSON.stringify(['q1', 'q2', 'q3', 'q4', 'q5']))
    
    render(<ChallengePage {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/mission.*complete/i)).toBeInTheDocument()
    })
  })
})