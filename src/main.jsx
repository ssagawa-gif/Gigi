import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Brand fonts are bundled with the app (no Google Fonts call), so every screen,
// the offline demo HTML and every browser show exactly the same type.
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
