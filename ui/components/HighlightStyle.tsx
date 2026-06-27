'use client';

import { useEffect } from 'react';

export function HighlightStyle() {
  useEffect(() => {
    const id = 'new-row-flash-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes new-row-flash {
        0%, 100% { background-color: rgba(99, 102, 241, 0); }
        20%, 80% { background-color: rgba(99, 102, 241, 0.30); }
        50% { background-color: rgba(99, 102, 241, 0.10); }
      }
      tr.new-row-highlight {
        animation: new-row-flash 2.4s ease-in-out 4;
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}
