import React from 'react';

const ScrollingPlus: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes scrollLeft {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(-100px);
          }
        }
        
        .plus-icon {
          will-change: transform;
        }
      `}</style>
      
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        {/* Multiple rows of scrolling plus signs */}
        {[...Array(8)].map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="absolute w-full flex items-center"
            style={{
              top: `${10 + rowIndex * 12}%`,
              animationDelay: `${rowIndex * -2}s`
            }}
          >
            {/* Create enough plus signs to fill screen width + extra for seamless loop */}
            {[...Array(20)].map((_, index) => (
              <div
                key={index}
                className="plus-icon text-red-400/20 font-bold text-xl mr-16 flex-shrink-0"
                style={{
                  animation: `scrollLeft ${8 + rowIndex * 0.5}s linear infinite`,
                  animationDelay: `${index * -0.5}s`
                }}
              >
                +
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default ScrollingPlus;