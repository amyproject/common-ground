import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/fraunces'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import './exploration/exploration.css'
import './community/community.css'
import './exploration/region.css'
import './hub/hub-pages.css'
import './guild/guild.css'
import App from './App.tsx'
import { HubHome } from './hub/HubHome.tsx'
import { Login } from './hub/Login.tsx'
import { Join, VolunteerDashboard } from './hub/Volunteer.tsx'
import './hub/volunteer.css'

// Hub routes: "/" is the hub home, "/login" signs organizers in, and "/learn" is the
// Explore map. Plan (/plan/) and Canopy (/canopy/) are separate static sections.
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const page = path === '/' ? <HubHome /> : path === '/login' ? <Login /> : path === '/join' ? <Join /> : path === '/volunteer' ? <VolunteerDashboard /> : <App />

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{page}</React.StrictMode>)
