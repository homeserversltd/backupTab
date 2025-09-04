/**
 * HOMESERVER Repository Card Component
 * Individual repository management card
 */

import React from 'react';
import { Repository } from '../types';

interface RepositoryCardProps {
  repository: Repository;
  selected: boolean;
  onToggle: (repository: Repository) => void;
  className?: string;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({ 
  repository, 
  selected,
  onToggle,
  className = '' 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '✓';
      case 'inactive': return '⚠';
      default: return '?';
    }
  };

  const formatSize = (size?: number) => {
    if (!size) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let sizeValue = size;
    
    while (sizeValue >= 1024 && unitIndex < units.length - 1) {
      sizeValue /= 1024;
      unitIndex++;
    }
    
    return `${sizeValue.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatLastCommit = (lastCommit?: string) => {
    if (!lastCommit) return 'Unknown';
    
    const date = new Date(lastCommit);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div 
      className={`repository-card ${selected ? 'selected' : ''} ${className}`}
      onClick={() => onToggle(repository)}
    >
      <div className="repository-card-header">
        <div className="repository-card-title">
          <h4>{repository.name}</h4>
          <span className={`status-badge ${getStatusColor(repository.status)}`}>
            {getStatusIcon(repository.status)} {repository.status}
          </span>
        </div>
        <div className="repository-checkbox">
          <input 
            type="checkbox" 
            checked={selected}
            onChange={() => onToggle(repository)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <div className="repository-card-content">
        <div className="repository-path">
          <strong>Path:</strong> {repository.path}
        </div>
        
        <div className="repository-meta">
          <div className="repository-size">
            <strong>Size:</strong> {formatSize(repository.size)}
          </div>
          <div className="repository-last-commit">
            <strong>Last Commit:</strong> {formatLastCommit(repository.last_commit)}
          </div>
        </div>
      </div>

      <div className="repository-actions">
        <button 
          className="action-button secondary"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement repository details view
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
};
