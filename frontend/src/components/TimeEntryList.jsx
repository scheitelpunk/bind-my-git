import React from 'react'
import { format } from 'date-fns'

export const TimeEntryList = ({ entries, onEdit, onDelete, isLoading }) => {
  const formatDuration = (minutes) => {
    if (!minutes) return 'Active'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateCost = (entry) => {
    if (!entry.duration_minutes || !entry.hourly_rate) return null
    const hours = entry.duration_minutes / 60
    return hours * entry.hourly_rate
  }

  if (isLoading) {
    return (
      <div data-testid="loading-indicator" className="loading">
        Loading time entries...
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div data-testid="empty-state" className="empty-state">
        No time entries found. Start tracking your time!
      </div>
    )
  }

  return (
    <div className="time-entry-list" data-testid="time-entry-list">
      <h3>Time Entries</h3>

      <div className="entries">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`entry ${entry.is_active ? 'active' : ''}`}
            data-testid={`time-entry-${entry.id}`}
          >
            <div className="entry-header">
              <span className="description" data-testid={`description-${entry.id}`}>
                {entry.description}
              </span>
              {entry.is_active && (
                <span className="active-badge" data-testid={`active-badge-${entry.id}`}>
                  Active
                </span>
              )}
            </div>

            <div className="entry-details">
              <div className="time-info">
                <span data-testid={`start-time-${entry.id}`}>
                  Started: {format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}
                </span>
                {entry.end_time && (
                  <span data-testid={`end-time-${entry.id}`}>
                    Ended: {format(new Date(entry.end_time), 'MMM dd, yyyy HH:mm')}
                  </span>
                )}
              </div>

              <div className="duration-cost">
                <span
                  className="duration"
                  data-testid={`duration-${entry.id}`}
                >
                  {formatDuration(entry.duration_minutes)}
                </span>

                {entry.hourly_rate && (
                  <span
                    className="rate"
                    data-testid={`rate-${entry.id}`}
                  >
                    {formatCurrency(entry.hourly_rate)}/hr
                  </span>
                )}

                {calculateCost(entry) && (
                  <span
                    className="cost"
                    data-testid={`cost-${entry.id}`}
                  >
                    Total: {formatCurrency(calculateCost(entry))}
                  </span>
                )}
              </div>
            </div>

            <div className="entry-actions">
              <button
                onClick={() => onEdit(entry)}
                disabled={entry.is_active}
                data-testid={`edit-button-${entry.id}`}
                className="edit-btn"
              >
                Edit
              </button>

              <button
                onClick={() => onDelete(entry.id)}
                disabled={entry.is_active}
                data-testid={`delete-button-${entry.id}`}
                className="delete-btn"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}