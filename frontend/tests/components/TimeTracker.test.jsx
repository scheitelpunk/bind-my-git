import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeTracker } from '../../src/components/TimeTracker'

describe('TimeTracker', () => {
  const mockOnStart = vi.fn()
  const mockOnStop = vi.fn()

  const defaultProps = {
    onStart: mockOnStart,
    onStop: mockOnStop,
    activeEntry: null,
    isLoading: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Timer Display', () => {
    it('shows 00:00:00 when no active entry', () => {
      render(<TimeTracker {...defaultProps} />)

      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00:00')
    })

    it('shows active entry description when timer is running', () => {
      const activeEntry = {
        id: 1,
        description: 'Working on feature X',
        start_time: new Date().toISOString()
      }

      render(<TimeTracker {...defaultProps} activeEntry={activeEntry} />)

      expect(screen.getByTestId('active-description')).toHaveTextContent('Working on feature X')
    })

    it('updates elapsed time every second for active entry', async () => {
      const startTime = new Date()
      const activeEntry = {
        id: 1,
        description: 'Test task',
        start_time: startTime.toISOString()
      }

      render(<TimeTracker {...defaultProps} activeEntry={activeEntry} />)

      // Initial time should be 00:00:00
      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00:00')

      // Advance time by 1 second
      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00:01')
      })

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000)

      await waitFor(() => {
        expect(screen.getByTestId('timer-display')).toHaveTextContent('00:01:01')
      })
    })

    it('formats time correctly for hours, minutes, and seconds', async () => {
      const startTime = new Date(Date.now() - 3661000) // 1 hour, 1 minute, 1 second ago
      const activeEntry = {
        id: 1,
        description: 'Long task',
        start_time: startTime.toISOString()
      }

      render(<TimeTracker {...defaultProps} activeEntry={activeEntry} />)

      await waitFor(() => {
        expect(screen.getByTestId('timer-display')).toHaveTextContent('01:01:01')
      })
    })
  })

  describe('Start Controls', () => {
    it('renders start controls when no active entry', () => {
      render(<TimeTracker {...defaultProps} />)

      expect(screen.getByTestId('start-controls')).toBeInTheDocument()
      expect(screen.getByTestId('description-input')).toBeInTheDocument()
      expect(screen.getByTestId('project-select')).toBeInTheDocument()
      expect(screen.getByTestId('start-button')).toBeInTheDocument()
    })

    it('disables start button when description is empty', () => {
      render(<TimeTracker {...defaultProps} />)

      const startButton = screen.getByTestId('start-button')
      expect(startButton).toBeDisabled()
    })

    it('disables start button when project is not selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      await user.type(descriptionInput, 'Test task')

      const startButton = screen.getByTestId('start-button')
      expect(startButton).toBeDisabled()
    })

    it('enables start button when both description and project are filled', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      const projectSelect = screen.getByTestId('project-select')

      await user.type(descriptionInput, 'Test task')
      await user.selectOptions(projectSelect, '1')

      const startButton = screen.getByTestId('start-button')
      expect(startButton).not.toBeDisabled()
    })

    it('calls onStart with correct data when start button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      const projectSelect = screen.getByTestId('project-select')
      const startButton = screen.getByTestId('start-button')

      await user.type(descriptionInput, 'Feature development')
      await user.selectOptions(projectSelect, '2')
      await user.click(startButton)

      expect(mockOnStart).toHaveBeenCalledWith({
        description: 'Feature development',
        project_id: 2,
        hourly_rate: 50.00
      })
    })

    it('trims whitespace from description', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      const projectSelect = screen.getByTestId('project-select')
      const startButton = screen.getByTestId('start-button')

      await user.type(descriptionInput, '  Trimmed task  ')
      await user.selectOptions(projectSelect, '1')
      await user.click(startButton)

      expect(mockOnStart).toHaveBeenCalledWith({
        description: 'Trimmed task',
        project_id: 1,
        hourly_rate: 50.00
      })
    })

    it('disables controls when loading', () => {
      render(<TimeTracker {...defaultProps} isLoading={true} />)

      expect(screen.getByTestId('description-input')).toBeDisabled()
      expect(screen.getByTestId('project-select')).toBeDisabled()
      expect(screen.getByTestId('start-button')).toBeDisabled()
      expect(screen.getByTestId('start-button')).toHaveTextContent('Starting...')
    })
  })

  describe('Stop Controls', () => {
    const activeEntry = {
      id: 1,
      description: 'Active task',
      start_time: new Date().toISOString()
    }

    it('renders stop controls when there is an active entry', () => {
      render(<TimeTracker {...defaultProps} activeEntry={activeEntry} />)

      expect(screen.getByTestId('stop-controls')).toBeInTheDocument()
      expect(screen.getByTestId('stop-button')).toBeInTheDocument()
      expect(screen.queryByTestId('start-controls')).not.toBeInTheDocument()
    })

    it('calls onStop with entry id when stop button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} activeEntry={activeEntry} />)

      const stopButton = screen.getByTestId('stop-button')
      await user.click(stopButton)

      expect(mockOnStop).toHaveBeenCalledWith(1)
    })

    it('disables stop button when loading', () => {
      render(<TimeTracker {...defaultProps} activeEntry={activeEntry} isLoading={true} />)

      expect(screen.getByTestId('stop-button')).toBeDisabled()
      expect(screen.getByTestId('stop-button')).toHaveTextContent('Stopping...')
    })

    it('clears form fields after stopping timer', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      // First render with no active entry to fill the form
      const { rerender } = render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      const projectSelect = screen.getByTestId('project-select')

      await user.type(descriptionInput, 'Test task')
      await user.selectOptions(projectSelect, '1')

      // Now simulate having an active entry
      rerender(<TimeTracker {...defaultProps} activeEntry={activeEntry} />)

      const stopButton = screen.getByTestId('stop-button')
      await user.click(stopButton)

      // Simulate going back to no active entry
      rerender(<TimeTracker {...defaultProps} />)

      expect(screen.getByTestId('description-input')).toHaveValue('')
      expect(screen.getByTestId('project-select')).toHaveValue('')
    })
  })

  describe('Edge Cases', () => {
    it('handles missing start_time in active entry', () => {
      const activeEntryWithoutStartTime = {
        id: 1,
        description: 'Task without start time'
      }

      render(<TimeTracker {...defaultProps} activeEntry={activeEntryWithoutStartTime} />)

      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00:00')
    })

    it('prevents starting with only whitespace description', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      const projectSelect = screen.getByTestId('project-select')
      const startButton = screen.getByTestId('start-button')

      await user.type(descriptionInput, '   ')
      await user.selectOptions(projectSelect, '1')

      expect(startButton).toBeDisabled()
    })

    it('handles project selection with string values correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TimeTracker {...defaultProps} />)

      const descriptionInput = screen.getByTestId('description-input')
      const projectSelect = screen.getByTestId('project-select')
      const startButton = screen.getByTestId('start-button')

      await user.type(descriptionInput, 'Test task')
      await user.selectOptions(projectSelect, '2')
      await user.click(startButton)

      expect(mockOnStart).toHaveBeenCalledWith({
        description: 'Test task',
        project_id: 2, // Should be converted to number
        hourly_rate: 50.00
      })
    })
  })
})