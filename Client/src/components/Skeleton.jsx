import React from 'react';

const Skeleton = ({ type }) => {
  const classes = `skeleton ${type}`;
  
  return (
    <div className={classes}>
      <div className="skeleton-shimmer"></div>
    </div>
  );
};

export default Skeleton;

// Add this to your CSS:
/*
.skeleton { background: #e5e7eb; border-radius: 4px; margin: 10px 0; overflow: hidden; position: relative; }
.skeleton.text { height: 16px; width: 100%; }
.skeleton.title { height: 24px; width: 60%; }
.skeleton-shimmer {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
*/