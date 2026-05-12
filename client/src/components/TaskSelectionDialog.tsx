/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import React from 'react';
import { X } from 'lucide-react';
import type { Task } from 'conclave-shared';
import type { ConclaveActions } from '../services/conclave';
import { Modal } from './Modal';
import './TaskSelectionDialog.css';

interface Props {
  actions: ConclaveActions;
  currentTaskId: string | null;
  onClose: () => void;
  tasks: Task[];
}

export const TaskSelectionDialog: React.FC<Props> = ({ actions, currentTaskId, onClose, tasks }) => {
  const selectTask = (taskId: string | null) => {
    actions.adminSetTask(taskId);
    onClose();
  };

  return (
    <Modal onClose={onClose} contentClassName="task-selector-modal">
      <div className="task-selector-header">
        <div>
          <h3>Select task</h3>
          <p>Choose what the room votes on next.</p>
        </div>
        <button className="icon-button" onClick={onClose} title="Close">
          <X size={18} />
        </button>
      </div>

      <button
        className={`task-selector-item ${currentTaskId === null ? 'active' : ''}`}
        onClick={() => selectTask(null)}
      >
        <span>Adhoc vote</span>
        <small>No task selected</small>
      </button>

      <div className="task-selector-list">
        {tasks.map(task => (
          <button
            key={task.id}
            className={`task-selector-item ${currentTaskId === task.id ? 'active' : ''}`}
            onClick={() => selectTask(task.id)}
          >
            <span>{task.name}</span>
            <small>{task.rounds.length} {task.rounds.length === 1 ? 'round' : 'rounds'}</small>
          </button>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className="task-selector-empty">No tasks yet.</p>
      )}
    </Modal>
  );
};
