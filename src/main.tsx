import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import pkg from '../package.json';

console.log(
  `%c Coral %c v${pkg.version} %c Build: ${new Date().toLocaleString()} `,
  'background: #a5b4fc; color: #13141f; font-weight: bold; border-radius: 4px 0 0 4px; padding: 2px 6px;',
  'background: #2a2d40; color: #e2e8f0; padding: 2px 6px;',
  'background: #1e2030; color: #94a3b8; border-radius: 0 4px 4px 0; padding: 2px 6px;'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
