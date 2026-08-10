import { createRoot } from 'react-dom/client';
import App from './App';

// No StrictMode: its deliberate double-invoke of effects would tear down the
// AudioContext and the hand-tracking model that the app sets up on mount.
createRoot(document.getElementById('root')!).render(<App />);
