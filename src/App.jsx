import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { SessionProvider, useSession } from './lib/session.jsx';
import { IS_DEMO, api } from './lib/api.js';
import { Welcome, Consent, Auth, AboutYou, HealthHistory } from './pages/patient/Onboarding.jsx';
import Home from './pages/patient/Home.jsx';
import Record from './pages/patient/Record.jsx';
import { AddToRecord, Upload, CheckResults } from './pages/patient/AddResult.jsx';
import Marker, { RequestReview } from './pages/patient/Marker.jsx';
import { FindDoctor, DoctorProfile, Booked } from './pages/patient/Doctors.jsx';
import { Sharing, Plans, Settings, NotificationsList } from './pages/patient/More.jsx';
import { CareTeam } from './pages/patient/CareTeam.jsx';
import { Queue, Agenda, Patients, DoctorNotifications, DoctorProfileEdit } from './pages/doctor/Console.jsx';
import { Phone, Loading } from './components/ui.jsx';
import Admin from './pages/Admin.jsx';
import { ForgotPassword, ResetPassword } from './pages/Password.jsx';

function Guard({ role, children }) {
  const { session, showToast } = useSession();
  const loc = useLocation();
  const { t } = useI18n();
  // A doctor who came from a patient's care-team invitation: link her once she is signed in
  const isDoctor = session?.profile?.role === 'doctor';
  useEffect(() => {
    let token = null;
    try { token = localStorage.getItem('gigi_invite'); } catch { /* storage blocked */ }
    if (!isDoctor || !token) return;
    api.acceptCareInvite(token).then((ok) => { if (ok) showToast(t('care.joinedToast')); })
      .catch(() => {}).finally(() => { try { localStorage.removeItem('gigi_invite'); } catch { /* ignore */ } });
  }, [isDoctor]);
  if (session === undefined) return <Phone><Loading /></Phone>;
  if (!session) return <Navigate to={role === 'doctor' ? '/doctor/login' : '/'} replace state={{ from: loc.pathname }} />;
  if (session.profile?.role !== role) return <Navigate to={session.profile?.role === 'doctor' ? '/doctor' : '/home'} replace />;
  // The health history is required once (Dr Kat's feedback): send her there before anything else
  if (role === 'patient' && !session.profile?.medical_history && !['/about', '/history'].includes(loc.pathname)) {
    return <Navigate to={session.profile?.reasons?.length ? '/history' : '/about'} replace />;
  }
  return children;
}

/** Any signed-in account can open /admin; the page itself checks the admin role in the database. */
function AdminGuard({ children }) {
  const { session } = useSession();
  if (session === undefined) return <Phone><Loading /></Phone>;
  if (!session) return <Navigate to="/auth?mode=login&next=/admin" replace />;
  return children;
}

function DemoBanner() {
  const { t } = useI18n();
  const { refresh } = useSession();
  if (!IS_DEMO) return null;
  return (
    <div className="demo-banner">
      <span>{t('demo.banner')}</span>
      <a href="#/home" target="_blank" rel="noreferrer">{t('demo.patientTab')}</a>
      <a href="#/doctor" target="_blank" rel="noreferrer">{t('demo.doctorTab')}</a>
      <button onClick={async () => { await api.resetDemo(); await refresh(); window.location.hash = '#/'; }}>{t('demo.reset')}</button>
    </div>
  );
}

const P = (el) => <Guard role="patient">{el}</Guard>;
const D = (el) => <Guard role="doctor">{el}</Guard>;

export default function App() {
  return (
    <I18nProvider>
      <SessionProvider>
        <HashRouter>
          <DemoBanner />
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/auth" element={<Auth role="patient" />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route path="/about" element={P(<AboutYou />)} />
            <Route path="/history" element={P(<HealthHistory />)} />
            <Route path="/home" element={P(<Home />)} />
            <Route path="/record" element={P(<Record />)} />
            <Route path="/add" element={P(<AddToRecord />)} />
            <Route path="/add/upload" element={P(<Upload />)} />
            <Route path="/add/check" element={P(<CheckResults />)} />
            <Route path="/marker/:code" element={P(<Marker />)} />
            <Route path="/review/:code" element={P(<RequestReview />)} />
            <Route path="/doctors" element={P(<FindDoctor />)} />
            <Route path="/care-team" element={P(<CareTeam />)} />
            <Route path="/doctors/:id" element={P(<DoctorProfile />)} />
            <Route path="/booked/:id" element={P(<Booked />)} />
            <Route path="/sharing" element={P(<Sharing />)} />
            <Route path="/plans" element={P(<Plans />)} />
            <Route path="/settings" element={P(<Settings />)} />
            <Route path="/notifications" element={P(<NotificationsList />)} />

            <Route path="/doctor/login" element={<Auth role="doctor" />} />
            <Route path="/doctor" element={D(<Queue />)} />
            <Route path="/doctor/queue/:id" element={D(<Queue />)} />
            <Route path="/doctor/agenda" element={D(<Agenda />)} />
            <Route path="/doctor/patients" element={D(<Patients />)} />
            <Route path="/doctor/notifications" element={D(<DoctorNotifications />)} />
            <Route path="/doctor/profile" element={D(<DoctorProfileEdit />)} />
            <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </SessionProvider>
    </I18nProvider>
  );
}
