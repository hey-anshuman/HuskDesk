import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
);
