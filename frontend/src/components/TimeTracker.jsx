import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'

export const TimeTracker = ({ onStart, onStop, activeEntry, isLoading }) => {
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer effect for active entry
  useEffect(() => {
    let interval = null

    if (activeEntry && activeEntry.start_time) {
      interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time)
        const now = new Date()
        const elapsed = Math.floor((now - startTime) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [activeEntry])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (!description.trim() || !projectId) {
      return
    }

    onStart({
      description: description.trim(),
      project_id: parseInt(projectId),
      hourly_rate: 50.00
    })
  }

  const handleStop = () => {
    if (activeEntry) {
      onStop(activeEntry.id)
      setDescription('')
      setProjectId('')
    }
  }

  return (
    <div className="time-tracker" data-testid="time-tracker">
      <div className="timer-display" data-testid="timer-display">
        <h2>{formatTime(elapsedTime)}</h2>
        {activeEntry && (
          <p data-testid="active-description">
            {activeEntry.description}
          </p>
        )}
      </div>

      {!activeEntry ? (
        <div className="start-controls" data-testid="start-controls">
          <input
            type="text"
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="description-input"
            disabled={isLoading}
          />

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            data-testid="project-select"
            disabled={isLoading}
          >
            <option value="">Select Project</option>
            <option value="1">Project Alpha</option>
            <option value="2">Project Beta</option>
          </select>

          <button
            onClick={handleStart}
            disabled={!description.trim() || !projectId || isLoading}
            data-testid="start-button"
            className="start-btn"
          >
            {isLoading ? 'Starting...' : 'Start Timer'}
          </button>
        </div>
      ) : (
        <div className="stop-controls" data-testid="stop-controls">
          <button
            onClick={handleStop}
            disabled={isLoading}
            data-testid="stop-button"
            className="stop-btn"
          >
            {isLoading ? 'Stopping...' : 'Stop Timer'}
          </button>
        </div>
      )}
    </div>
  )
}