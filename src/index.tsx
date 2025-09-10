import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TestApp from './TestApp';
import '../styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // Switch back to main App
  root.render(<App />);
}
