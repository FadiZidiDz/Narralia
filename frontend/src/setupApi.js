import axios from 'axios';

// The hosted site cannot forward login and registration through a redirect.
// Call the API directly. Local development still uses the Vite /api proxy.
const host = window.location.hostname;
if (host.endsWith('.onrender.com') && host !== 'narralia-api.onrender.com') {
  axios.defaults.baseURL = 'https://narralia-api.onrender.com';
}
