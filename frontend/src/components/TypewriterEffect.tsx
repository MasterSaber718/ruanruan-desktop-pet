import React, { useState, useEffect } from 'react';

interface TypewriterEffectProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export const TypewriterEffect: React.FC<TypewriterEffectProps> = ({ 
  text, 
  speed = 30, 
  delay = 0,
  onComplete 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let currentIndex = 0;
    
    const startTyping = () => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(startTyping, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    const startDelay = setTimeout(() => {
      startTyping();
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(startDelay);
    };
  }, [text, speed, delay, onComplete]);

  return (
    <span>
      {displayText}
      {!isComplete && <span style={{ opacity: 0.5 }}>|</span>}
    </span>
  );
};

export default TypewriterEffect;
