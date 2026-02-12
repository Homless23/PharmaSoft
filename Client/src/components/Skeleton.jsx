import React from 'react';

export const SkeletonBase = ({ width, height, borderRadius = '8px', className = '' }) => (
  <div 
    className={`skeleton-box ${className}`} 
    style={{ width, height, borderRadius }}
  ></div>
);

export const CardSkeleton = () => (
  <div className="card skeleton-card">
    <SkeletonBase width="40%" height="15px" className="mb-15" />
    <SkeletonBase width="80%" height="30px" />
    <div className="skeleton-footer mt-20">
      <SkeletonBase width="30%" height="10px" />
    </div>
  </div>
);