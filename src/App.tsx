import React from 'react';
import { Playground } from './components/Playground';
import './styles/index.css';
import './styles/markdown.css';
import './styles/katex.css';

// 根组件直接渲染Playground
const App: React.FC = () => {
  return (
    <div className="app-container">
      <Playground />
    </div>
  );
};

export default App;