import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { Playground } from './components/Playground';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>
);