import { useMemo, useState } from 'react';
import {
  Axe,
  BadgeCheck,
  CircleHelp,
  LogIn,
  Mail,
  Map,
  Package,
  Settings,
  ShieldAlert,
  TreePine,
  UserPlus,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';

const phases = {
  TITLE: 'title',
  AUTH: 'auth',
  MENU: 'menu',
};

const tabs = {
  OVERVIEW: 'overview',
  SHOP: 'shop',
  SETTINGS: 'settings',
};

export function App() {
  const [phase, setPhase] = useState(phases.TITLE);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState(tabs.OVERVIEW);
  const [muted, setMuted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 9 + Math.random() * 10,
        size: 3 + Math.random() * 4,
      })),
    [],
  );

  const onSubmit = (event) => {
    event.preventDefault();
    setPhase(phases.MENU);
  };

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <div className="forest-bg" />
        <img
          className="bg-art"
          src="https://placehold.co/1080x1920/1f3b2d/ffffff?text=Timbaaaa+Forest+Placeholder"
          alt="Fond placeholder forêt"
        />
        <div className="overlay" />
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
          />
        ))}

        {phase === phases.TITLE && (
          <article className="screen title-screen" onClick={() => setPhase(phases.AUTH)}>
            <button
              className="sound-btn"
              onClick={(event) => {
                event.stopPropagation();
                setMuted((prev) => !prev);
              }}
              aria-label="Son"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div className="title-logo">
              <TreePine size={52} />
              <Axe size={20} className="axe" />
            </div>
            <h1>Timbaaaa</h1>
            <p className="subtitle">MMORPG bûcheronnage · Android only</p>
            <p className="cta">Toucher pour commencer</p>
          </article>
        )}

        {phase === phases.AUTH && (
          <article className="screen auth-screen">
            <header>
              <h2>{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
              <p>Un compte = une IP (sauf rôle admin en whitelist).</p>
            </header>

            <form className="auth-card" onSubmit={onSubmit}>
              {authMode === 'register' && (
                <label>
                  Pseudo
                  <input value={pseudo} onChange={(event) => setPseudo(event.target.value)} required />
                </label>
              )}

              <label>
                Email
                <div className="input-row">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="toi@email.com"
                    required
                  />
                </div>
              </label>

              <label>
                Mot de passe
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>

              <p className="warning">
                <ShieldAlert size={14} />
                Vérification IP active en production (placeholder serveur pour ce sprint).
              </p>

              <button type="submit" className="primary-btn">
                {authMode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>

            <button
              className="ghost-btn"
              onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
            >
              {authMode === 'login' ? 'Pas de compte ? Inscription' : 'Déjà inscrit ? Connexion'}
            </button>
          </article>
        )}

        {phase === phases.MENU && (
          <article className="screen menu-screen">
            <header className="menu-header">
              <div>
                <h2>Bienvenue, {pseudo || 'Bûcheron'}</h2>
                <p>Serveur FR-Forêt Centrale · 50 joueurs max</p>
              </div>
              <BadgeCheck size={20} />
            </header>

            <nav className="tab-row">
              <button onClick={() => setActiveTab(tabs.OVERVIEW)} className={activeTab === tabs.OVERVIEW ? 'active' : ''}>Vue</button>
              <button onClick={() => setActiveTab(tabs.SHOP)} className={activeTab === tabs.SHOP ? 'active' : ''}>Marchand</button>
              <button onClick={() => setActiveTab(tabs.SETTINGS)} className={activeTab === tabs.SETTINGS ? 'active' : ''}>Réglages</button>
            </nav>

            {activeTab === tabs.OVERVIEW && (
              <section className="panel-list">
                <Panel icon={Map} title="Sprint suivant" text="Prototype carte isométrique 2.5D + arbres procéduraux." />
                <Panel icon={Package} title="Boucle de base" text="Ramasser branche/pierre, craft hache novice, vente PNJ central." />
                <Panel icon={CircleHelp} title="Test smartphone" text="UI pensée 9:16, boutons larges, utilisable au pouce." />
              </section>
            )}

            {activeTab === tabs.SHOP && (
              <section className="panel-list">
                <Panel icon={Axe} title="Haches" text="Gacha de stats par rareté (commune → légendaire)." />
                <Panel icon={Package} title="Transport" text="Sac, brouette puis véhicules (bloqués par niveau)." />
              </section>
            )}

            {activeTab === tabs.SETTINGS && (
              <section className="panel-list">
                <Panel icon={Settings} title="Graphismes Android" text="30/60 FPS, mode batterie, qualité texture." />
                <Panel icon={Wrench} title="Debug" text="Boutons de reset sprint pour test physique rapide." />
              </section>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

function Panel({ icon: Icon, title, text }) {
  return (
    <article className="panel">
      <div className="panel-icon">
        <Icon size={18} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}
