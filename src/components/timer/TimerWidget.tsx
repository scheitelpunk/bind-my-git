import React, { useState } from 'react';
import { Play, Pause, Square, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useMyTasks } from '@/hooks/useTasks';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import {TaskStatus} from "@/types";

const TimerWidget: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [description, setDescription] = useState('');

  const {
    activeTimer,
    isRunning,
    formattedElapsedTime,
    startTimer,
    stopTimer,
    isStarting,
    isStopping,
  } = useTimer();

  const { data: myTasks = [] } = useMyTasks();

  const handleStartTimer = () => {
    if (!selectedTaskId) return;

    startTimer({
      task_id: selectedTaskId,
      description: description.trim() || 'Working on task',
    });

    setShowStartModal(false);
    setSelectedTaskId('');
    setDescription('');
  };

  const handleStopTimer = () => {
    stopTimer({ description: description.trim() });
    setDescription('');
  };

  const openStartModal = () => {
    setShowStartModal(true);
    setIsExpanded(false);
  };

  // Show all tasks except completed ones
  const availableTasks = myTasks.filter(task =>
    task.status !== TaskStatus.DONE
  );

  const taskOptions = availableTasks.map(task => ({
    value: task.id,
    label: `${task.title} (${task.project?.name || 'No Project'})`,
  }));

  return (
    <>
      {/* Timer Widget */}
      <div className="fixed bottom-4 right-4 z-40">
        <div
          className={cn(
            'bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300',
            isExpanded ? 'w-80' : 'w-64'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary-600" />
              <span className="font-medium text-gray-900">Timer</span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Timer Display */}
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="text-3xl font-mono font-bold text-gray-900">
                {formattedElapsedTime}
              </div>
              {activeTimer && (
                <div className="text-sm text-gray-600 mt-1">
                  {activeTimer.task.title}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-2">
              {!isRunning ? (
                <Button
                  onClick={openStartModal}
                  disabled={isStarting}
                  loading={isStarting}
                  size="sm"
                  className="flex items-center"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              ) : (
                <Button
                  onClick={handleStopTimer}
                  disabled={isStopping}
                  loading={isStopping}
                  variant="danger"
                  size="sm"
                  className="flex items-center"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && activeTimer && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What are you working on?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Running Indicator */}
          {isRunning && (
            <div className="h-1 bg-primary-600 animate-pulse" />
          )}
        </div>
      </div>

      {/* Start Timer Modal */}
      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Start Timer"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Select Task"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            options={taskOptions}
            placeholder="Choose a task..."
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you be working on?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowStartModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartTimer}
              disabled={!selectedTaskId || isStarting}
              loading={isStarting}
            >
              Start Timer
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TimerWidget;