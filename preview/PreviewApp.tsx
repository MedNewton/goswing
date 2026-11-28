// preview/PreviewApp.tsx — web preview entry: fake API, then the real App.
import { installMockFetch } from './api/mockFetch';

installMockFetch();

// NativeWind maps the app's "System" font family to nothing on web; point it at
// a sans-serif so the preview looks like the phone.
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  const regular = 'local("Inter"),local("Helvetica Neue"),local("Arial"),local("Liberation Sans"),local("DejaVu Sans")';
  const bold =
    'local("Inter Bold"),local("Helvetica Neue Bold"),local("Arial Bold"),local("Liberation Sans Bold"),local("DejaVu Sans Bold")';
  style.textContent =
    `@font-face{font-family:System;font-weight:100 500;src:${regular};}` +
    `@font-face{font-family:System;font-weight:600 900;src:${bold};}`;
  document.head.appendChild(style);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const App = require('../App').default;
export default App;
