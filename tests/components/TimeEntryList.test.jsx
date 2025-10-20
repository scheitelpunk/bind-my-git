import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeEntryList } from '../../src/components/TimeEntryList'

describe('TimeEntryList', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    entries: [],
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    isLoading: false
  }

  const sampleEntries = [
    {
      id: 1,
      description: 'Feature development',
      start_time: '2024-01-01T09:00:00Z',
      end_time: '2024-01-01T17:00:00Z',
      duration_minutes: 480,
      hourly_rate: 50.00,
      is_active: false
    },
    {
      id: 2,
      description: 'Bug fixing',
      start_time: '2024-01-02T09:00:00Z',
      end_time: null,
      duration_minutes: null,
      hourly_rate: 60.00,
      is_active: true
    },
    {
      id: 3,
      description: 'Code review',
      start_time: '2024-01-03T14:00:00Z',
      end_time: '2024-01-03T16:30:00Z',
      duration_minutes: 150,
      hourly_rate: 75.00,
      is_active: false
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading and Empty States', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<TimeEntryList {...defaultProps} isLoading={true} />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('loading-indicator')).toHaveTextContent('Loading time entries...')
    })

    it('shows empty state when no entries provided', () => {
      render(<TimeEntryList {...defaultProps} entries={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('empty-state')).toHaveTextContent('No time entries found. Start tracking your time!')
    })

    it('shows empty state when entries is null', () => {
      render(<TimeEntryList {...defaultProps} entries={null} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('shows empty state when entries is undefined', () => {
      render(<TimeEntryList {...defaultProps} entries={undefined} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('Entry Display', () => {
    it('renders list of time entries', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('time-entry-list')).toBeInTheDocument()
      expect(screen.getByTestId('time-entry-1')).toBeInTheDocument()
      expect(screen.getByTestId('time-entry-2')).toBeInTheDocument()
      expect(screen.getByTestId('time-entry-3')).toBeInTheDocument()
    })

    it('displays entry descriptions correctly', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('description-1')).toHaveTextContent('Feature development')
      expect(screen.getByTestId('description-2')).toHaveTextContent('Bug fixing')
      expect(screen.getByTestId('description-3')).toHaveTextContent('Code review')
    })

    it('shows active badge for active entries', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('active-badge-2')).toBeInTheDocument()
      expect(screen.getByTestId('active-badge-2')).toHaveTextContent('Active')

      // Non-active entries should not have active badge
      expect(screen.queryByTestId('active-badge-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('active-badge-3')).not.toBeInTheDocument()
    })

    it('adds active class to active entries', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('time-entry-2')).toHaveClass('active')
      expect(screen.getByTestId('time-entry-1')).not.toHaveClass('active')
      expect(screen.getByTestId('time-entry-3')).not.toHaveClass('active')
    })
  })

  describe('Time Formatting', () => {
    it('displays start time correctly', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('start-time-1')).toHaveTextContent('Started: Jan 01, 2024 09:00')
      expect(screen.getByTestId('start-time-2')).toHaveTextContent('Started: Jan 02, 2024 09:00')
    })

    it('displays end time for completed entries', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('end-time-1')).toHaveTextContent('Ended: Jan 01, 2024 17:00')
      expect(screen.getByTestId('end-time-3')).toHaveTextContent('Ended: Jan 03, 2024 16:30')

      // Active entry should not have end time
      expect(screen.queryByTestId('end-time-2')).not.toBeInTheDocument()
    })

    it('formats duration correctly', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('duration-1')).toHaveTextContent('8h 0m') // 480 minutes
      expect(screen.getByTestId('duration-2')).toHaveTextContent('Active') // null duration
      expect(screen.getByTestId('duration-3')).toHaveTextContent('2h 30m') // 150 minutes
    })

    it('handles zero duration correctly', () => {
      const entryWithZeroDuration = [{
        id: 4,
        description: 'Quick task',
        start_time: '2024-01-04T10:00:00Z',
        end_time: '2024-01-04T10:00:00Z',
        duration_minutes: 0,
        hourly_rate: 50.00,
        is_active: false
      }]

      render(<TimeEntryList {...defaultProps} entries={entryWithZeroDuration} />)

      expect(screen.getByTestId('duration-4')).toHaveTextContent('0h 0m')
    })
  })

  describe('Rate and Cost Display', () => {
    it('displays hourly rates correctly', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('rate-1')).toHaveTextContent('$50.00/hr')
      expect(screen.getByTestId('rate-2')).toHaveTextContent('$60.00/hr')
      expect(screen.getByTestId('rate-3')).toHaveTextContent('$75.00/hr')
    })

    it('calculates and displays total cost correctly', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      // 480 minutes = 8 hours, 8 * $50 = $400
      expect(screen.getByTestId('cost-1')).toHaveTextContent('Total: $400.00')

      // Active entry should not have cost
      expect(screen.queryByTestId('cost-2')).not.toBeInTheDocument()

      // 150 minutes = 2.5 hours, 2.5 * $75 = $187.50
      expect(screen.getByTestId('cost-3')).toHaveTextContent('Total: $187.50')
    })

    it('handles entries without hourly rate', () => {
      const entryWithoutRate = [{
        id: 5,
        description: 'Unpaid work',
        start_time: '2024-01-05T10:00:00Z',
        end_time: '2024-01-05T12:00:00Z',
        duration_minutes: 120,
        hourly_rate: null,
        is_active: false
      }]

      render(<TimeEntryList {...defaultProps} entries={entryWithoutRate} />)

      expect(screen.queryByTestId('rate-5')).not.toBeInTheDocument()
      expect(screen.queryByTestId('cost-5')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('renders edit and delete buttons for each entry', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      expect(screen.getByTestId('edit-button-1')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button-1')).toBeInTheDocument()
      expect(screen.getByTestId('edit-button-2')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button-2')).toBeInTheDocument()
    })

    it('disables edit and delete buttons for active entries', () => {
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      // Active entry buttons should be disabled
      expect(screen.getByTestId('edit-button-2')).toBeDisabled()
      expect(screen.getByTestId('delete-button-2')).toBeDisabled()

      // Completed entry buttons should be enabled
      expect(screen.getByTestId('edit-button-1')).not.toBeDisabled()
      expect(screen.getByTestId('delete-button-1')).not.toBeDisabled()
    })

    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      await user.click(screen.getByTestId('edit-button-1'))

      expect(mockOnEdit).toHaveBeenCalledWith(sampleEntries[0])
    })

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      await user.click(screen.getByTestId('delete-button-3'))

      expect(mockOnDelete).toHaveBeenCalledWith(3)
    })

    it('does not call callbacks when disabled buttons are clicked', async () => {
      const user = userEvent.setup()
      render(<TimeEntryList {...defaultProps} entries={sampleEntries} />)

      // Try to click disabled buttons (active entry)
      await user.click(screen.getByTestId('edit-button-2'))
      await user.click(screen.getByTestId('delete-button-2'))

      expect(mockOnEdit).not.toHaveBeenCalled()
      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('Currency Formatting', () => {
    it('formats currency according to US locale', () => {
      const entryWithDecimals = [{
        id: 6,
        description: 'Decimal test',
        start_time: '2024-01-06T10:00:00Z',
        end_time: '2024-01-06T10:30:00Z',
        duration_minutes: 30, // 0.5 hours
        hourly_rate: 123.456, // Should round to 2 decimal places
        is_active: false
      }]

      render(<TimeEntryList {...defaultProps} entries={entryWithDecimals} />)

      expect(screen.getByTestId('rate-6')).toHaveTextContent('$123.46/hr')
      expect(screen.getByTestId('cost-6')).toHaveTextContent('Total: $61.73')
    })
  })

  describe('Edge Cases', () => {
    it('handles entries with missing optional fields', () => {
      const minimalEntry = [{
        id: 7,
        description: 'Minimal entry',
        start_time: '2024-01-07T10:00:00Z',
        // Missing end_time, duration_minutes, hourly_rate
        is_active: false
      }]

      render(<TimeEntryList {...defaultProps} entries={minimalEntry} />)

      expect(screen.getByTestId('description-7')).toHaveTextContent('Minimal entry')
      expect(screen.getByTestId('start-time-7')).toBeInTheDocument()
      expect(screen.queryByTestId('end-time-7')).not.toBeInTheDocument()
      expect(screen.getByTestId('duration-7')).toHaveTextContent('Active')
    })

    it('handles very long descriptions', () => {
      const longDescriptionEntry = [{
        id: 8,
        description: 'This is a very long description that might overflow the container and should be handled gracefully by the component',
        start_time: '2024-01-08T10:00:00Z',
        end_time: '2024-01-08T11:00:00Z',
        duration_minutes: 60,
        hourly_rate: 50.00,
        is_active: false
      }]

      render(<TimeEntryList {...defaultProps} entries={longDescriptionEntry} />)

      expect(screen.getByTestId('description-8')).toHaveTextContent(longDescriptionEntry[0].description)
    })
  })
})