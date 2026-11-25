import { Icon } from './components/Icon'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api'
import { DataProvider, useData, useMyAthlete } from './lib/data'
import { applyAccent } from './lib/athlete'
import { Logo } from './components/Logo'
import { AppLock } from './components/AppLock'
import { logout } from './lib/lock'
import { syncPush } from './lib/push'
import { Login } from './pages/Login'
import { Join } from './pages/Join'
import { CoachJoin } from './pages/CoachJoin'
const DbUpdate = lazy(() => import('./pages/DbUpdate').then((m) => ({ default: m.DbUpdate })))
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { More, MORE_ITEMS } from './pages/More'
const Season = lazy(() => import('./pages/Season').then((m) => ({ default: m.Season })))
import { Planning } from './pages/Planning'
import { PublicPrivacy } from './pages/PublicPrivacy'
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })))
import { AssignmentDetail } from './pages/AssignmentDetail'
const ExportSessions = lazy(() => import('./pages/ExportSessions').then((m) => ({ default: m.ExportSessions })))
const WhoDoesWhat = lazy(() => import('./pages/WhoDoesWhat').then((m) => ({ default: m.WhoDoesWhat })))
const Duplicates = lazy(() => import('./pages/Duplicates').then((m) => ({ default: m.Duplicates })))
import { Messages } from './pages/Messages'
import { feedbackToAnswer, unreadByAthlete, unreadByCoach } from './lib/messages'
const NotificationsSetup = lazy(() => import('./pages/NotificationsSetup').then((m) => ({ default: m.NotificationsSetup })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const MondayToday = lazy(() => import('./pages/monday/MondayToday').then((m) => ({ default: m.MondayToday })))
const MondayEdit = lazy(() => import('./pages/monday/MondayPlan').then((m) => ({ default: m.MondayEdit })))
const MondayPlan = lazy(() => import('./pages/monday/MondayPlan').then((m) => ({ default: m.MondayPlan })))
const MondayImport = lazy(() => import('./pages/monday/MondayImport').then((m) => ({ default: m.MondayImport })))
import { Sessions } from './pages/Sessions'
import { SessionEditor } from './pages/SessionEditor'
import { Athletes } from './pages/Athletes'
import { AthleteDetail } from './pages/AthleteDetail'
const Exercises = lazy(() => import('./pages/Exercises').then((m) => ({ default: m.Exercises })))
import { Tips, TipDetail } from './pages/Tips'
const Tests = lazy(() => import('./pages/Tests').then((m) => ({ default: m.Tests })))
const TestDetail = lazy(() => import('./pages/Tests').then((m) => ({ default: m.TestDetail })))
const TestEntry = lazy(() => import('./pages/Tests').then((m) => ({ default: m.TestEntry })))
const TestMatrix = lazy(() => import('./pages/Tests').then((m) => ({ default: m.TestMatrix })))
const ImportResults = lazy(() => import('./pages/ImportResults').then((m) => ({ default: m.ImportResults })))
const ImportSessions = lazy(() => import('./pages/ImportSessions').then((m) => ({ default: m.ImportSessions })))
const ImportProfiles = lazy(() => import('./pages/ImportProfiles').then((m) => ({ default: m.ImportProfiles })))
const Competitions = lazy(() => import('./pages/Competitions').then((m) => ({ default: m.Competitions })))
const Imports = lazy(() => import('./pages/Imports').then((m) => ({ default: m.Imports })))
const Research = lazy(() => import('./pages/Research').then((m) => ({ default: m.Research })))
const Assistant = lazy(() => import('./pages/Assistant').then((m) => ({ default: m.Assistant })))
const SprintPaces = lazy(() => import('./pages/SprintPaces').then((m) => ({ default: m.SprintPaces })))
import { AthleteHome } from './pages/athlete/AthleteHome'
import { AthleteSessions, AthleteSessionDetail } from './pages/athlete/AthleteSessions'
import { AthleteProgress } from './pages/athlete/AthleteProgress'
import { AthleteProfile } from './pages/athlete/AthleteProfile'

type NavItem = { to: string; label: string; icon: string }

// Barre du bas (téléphone) : 4 entrées + « Plus » ; sur ordinateur, la barre du haut montre aussi les entrées de « Plus »
const COACH_NAV: NavItem[] = [
  { to: '/', label: 'Aujourd’hui', icon: 'home' },
  { to: '/planning', label: 'Planning', icon: 'calendar' },
  { to: '/athletes', label: 'Athlètes', icon: 'users' },
  { to: '/messages', label: 'Messages', icon: 'message' },
  { to: '/plus', label: 'Plus', icon: 'list' },
]
const COACH_TOPNAV: NavItem[] = [...COACH_NAV.slice(0, 4), ...MORE_ITEMS.map(({ to, label, icon }) => ({ to, label, icon }))]

const ATHLETE_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/seances', label: 'Séances', icon: 'calendar' },
  { to: '/messages', label: 'Messages', icon: 'message' },
  { to: '/progres', label: 'Progrès', icon: 'chart' },
  { to: '/profil', label: 'Profil', icon: 'user' },
]

function Shell({ nav, top = nav, brand, right, children }: { nav: NavItem[]; top?: NavItem[]; brand: ReactNode; right?: ReactNode; children: ReactNode }) {
  const { pathname } = useLocation()
  const inMore = MORE_ITEMS.some((m) => pathname.startsWith(m.to))
  const { error, me, messages, feedback } = useData()
  // Pastille du menu Messages : non lus (+ retours sans réponse pour le coach)
  const badge = me?.role === 'coach' ? unreadByCoach(messages).length + feedbackToAnswer(feedback, messages).length : unreadByAthlete(messages).length
  const dot = (to: string) => (to === '/messages' && badge > 0 ? <b className="nav-badge" aria-label={`${badge} à lire`}>{badge}</b> : null)
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">{brand}</span>
        <nav className="topnav">
          {top.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'}><span className="nav-ico" aria-hidden><Icon name={n.icon} /></span>{n.label}{dot(n.to)}</NavLink>)}
        </nav>
        {right}
      </header>
      {api.mode === 'demo' && <div className="demo-banner">Mode démo – données enregistrées sur cet appareil uniquement</div>}
      {error && <div className="alert danger container">Erreur de chargement : {error}</div>}
      <main className="container"><Suspense fallback={<p className="muted">Chargement…</p>}>{children}</Suspense></main>
      <nav className="bottomnav">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive || (n.to === '/plus' && inMore) ? 'active' : '')}>
            <span><Icon name={n.icon} />{dot(n.to)}</span>
            <small>{n.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function CoachApp() {
  const { me } = useData()
  useEffect(() => applyAccent(null), [])
  return (
    <Shell nav={COACH_NAV} top={COACH_TOPNAV} brand={<><Logo kind="symbol" className="brand-logo" /><span className="brand-name">{me?.club_name ?? 'Coach Athlé'}</span></>}
      right={<button className="btn ghost small" onClick={() => logout(me?.email, api.signOut)}>Déconnexion</button>}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/plus" element={<More />} />
        <Route path="/saison" element={<Season />} />
        <Route path="/messages" element={<Messages coach />} />
        <Route path="/notifications" element={<NotificationsSetup />} />
        <Route path="/confidentialite" element={<Privacy />} />
        <Route path="/reglages" element={<Settings />} />
        <Route path="/lundi" element={<MondayToday />} />
        <Route path="/lundi/plan" element={<MondayPlan />} />
        <Route path="/lundi/plan/:date" element={<MondayEdit />} />
        <Route path="/lundi/import" element={<MondayImport />} />
        <Route path="/planning/athletes" element={<WhoDoesWhat />} />
        <Route path="/planning/doublons" element={<Duplicates />} />
        <Route path="/planning/export" element={<ExportSessions />} />
        <Route path="/planning/:id" element={<AssignmentDetail />} />
        <Route path="/seances" element={<Sessions />} />
        <Route path="/imports" element={<Imports/>}/>
        <Route path="/seances/import" element={<ImportSessions />} />
        <Route path="/seances/:id" element={<SessionEditor />} />
        <Route path="/exercices" element={<Exercises />} />
        <Route path="/athletes" element={<Athletes />} />
        <Route path="/athletes/questionnaire" element={<ImportProfiles />} />
        <Route path="/athletes/:id" element={<AthleteDetail />} />
        <Route path="/conseils" element={<Tips />} />
        <Route path="/conseils/:id" element={<TipDetail />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/sources" element={<Research />} />
        <Route path="/methodes" element={<Navigate to="/sources" replace />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/tests/saisie" element={<TestEntry />} />
        <Route path="/tests/tableau" element={<TestMatrix />} />
        <Route path="/tests/allures-sprint" element={<SprintPaces />} />
        <Route path="/tests/import" element={<ImportResults />} />
        <Route path="/tests/:id" element={<TestDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

function AthleteApp() {
  const athlete = useMyAthlete()
  const { loading } = useData()
  useEffect(() => applyAccent(athlete?.color ?? null), [athlete?.color])
  if (!athlete) return <div className="login"><p className="muted">{loading ? 'Chargement…' : 'Profil introuvable.'}</p></div>
  return (
    <Shell nav={ATHLETE_NAV} brand={<><Logo kind="symbol" className="brand-logo" /><span className="brand-name">{athlete.first_name}</span></>}>
      <Routes>
        <Route path="/" element={<AthleteHome />} />
        <Route path="/seances" element={<AthleteSessions />} />
        <Route path="/seances/:id" element={<AthleteSessionDetail />} />
        <Route path="/conseils" element={<Tips />} />
        <Route path="/conseils/:id" element={<TipDetail />} />
        <Route path="/progres" element={<AthleteProgress />} />
        <Route path="/messages" element={<Messages coach={false} />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/confidentialite" element={<Privacy />} />
        <Route path="/profil" element={<AthleteProfile key={athlete.id} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

function RoleGate() {
  const { me } = useData()
  const role = me?.role, email = me?.email
  // Notifications : l'abonnement de cet appareil suit le compte connecté
  useEffect(() => { if (role === 'coach' || role === 'athlete') syncPush() }, [role, email])
  if (!me) return <Login />
  return (
    <AppLock key={me.email} email={me.email}>
      {me.role === 'coach' ? <CoachApp /> : me.role === 'athlete' ? <AthleteApp /> : <Onboarding />}
    </AppLock>
  )
}

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Routes>
          <Route path="/information" element={<PublicPrivacy/>}/>
          <Route path="/rejoindre/:code" element={<Join />} />
          <Route path="/rejoindre/:code/:group" element={<Join />} />
          <Route path="/entraineur/:token" element={<CoachJoin />} />
          <Route path="/base" element={<Suspense fallback={null}><DbUpdate /></Suspense>} />
          <Route path="*" element={<RoleGate />} />
        </Routes>
      </DataProvider>
    </HashRouter>
  )
}
