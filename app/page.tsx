import VerificationPanel from './components/VerificationPanel';
import ThemeToggle from './components/ThemeToggle';

// Iconos de la franja de seguridad y de la lista de pasos.
function IcoShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IcoLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function IcoKey() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M15.5 12v2" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <span className="brand">
            <span className="brand-mark">B</span>
            Blerify
          </span>
          <nav className="nav-links">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#verificar">Verificar</a>
            <a href="#seguridad">Seguridad</a>
          </nav>
          <div className="nav-right">
            <span className="demo-pill">Demo · OIDC4VP</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">Verificación de identidad</span>
            <h1>
              Verifica una credencial digital <span className="accent">en segundos</span>
            </h1>
            <p className="hero-lead">
              Ejemplo de integración con Blerify usando OIDC4VP e ISO&nbsp;18013-5 (mDL). El navegador
              nunca ve secretos: un BFF inicia la verificación, muestra el código QR o el botón de la
              billetera y consulta el resultado por sondeo.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href="#verificar">
                Probar la verificación
              </a>
              <a className="btn btn-ghost btn-lg" href="#como-funciona">
                Cómo funciona
              </a>
            </div>
            <div className="hero-meta">
              <div className="stat">
                <b>OIDC4VP</b>
                <span>Protocolo de presentación</span>
              </div>
              <div className="stat">
                <b>ISO 18013-5</b>
                <span>Credencial mDL</span>
              </div>
              <div className="stat">
                <b>Sin secretos</b>
                <span>Todo pasa por el BFF</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="bank-card" aria-hidden="true">
              <div className="bc-top">
                <span>Blerify</span>
                <span className="chip" />
              </div>
              <div className="bc-number">DUI&nbsp;&nbsp;0123&nbsp;&nbsp;4567&nbsp;&nbsp;••8</div>
              <div className="bc-bottom">
                <div>
                  <div className="lbl">Formato</div>
                  <div>mso_mdoc</div>
                </div>
                <div style={{ fontWeight: 800, letterSpacing: '0.04em' }}>mDL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="verificar">
        <div className="container enroll-grid">
          <div className="enroll-copy" id="como-funciona">
            <h2>Tres pasos, sin formularios</h2>
            <p>
              La persona presenta su credencial desde la billetera y decide qué atributos revela. El
              sitio nunca pide una foto del documento ni almacena los datos que no necesita.
            </p>
            <ol className="checklist">
              <li>
                <span className="num">1</span>
                <div>
                  <b>Inicia la verificación</b>
                  <span>El BFF pide la transacción y devuelve un código seguro.</span>
                </div>
              </li>
              <li>
                <span className="num">2</span>
                <div>
                  <b>Presenta la credencial</b>
                  <span>Desde la billetera digital, escaneando el QR o con el enlace.</span>
                </div>
              </li>
              <li>
                <span className="num">3</span>
                <div>
                  <b>Recibe el resultado</b>
                  <span>Atributos revelados y el resultado de cada comprobación.</span>
                </div>
              </li>
            </ol>
          </div>
          <VerificationPanel />
        </div>
      </section>

      <section className="section" id="seguridad">
        <div className="container">
          <div className="section-head">
            <span className="kicker">Seguridad</span>
            <h2>Qué protege esta integración</h2>
          </div>
          <div className="security-grid">
            <div className="sec-item">
              <span className="ico"><IcoShield /></span>
              <div>
                <h3>Firma verificada</h3>
                <p>Se comprueba la firma del emisor y el vínculo con el titular.</p>
              </div>
            </div>
            <div className="sec-item">
              <span className="ico"><IcoLock /></span>
              <div>
                <h3>Divulgación selectiva</h3>
                <p>Solo se piden los atributos que la regla de verificación declara.</p>
              </div>
            </div>
            <div className="sec-item">
              <span className="ico"><IcoKey /></span>
              <div>
                <h3>Credenciales fuera del navegador</h3>
                <p>La cuenta de servicio vive en el BFF; el cliente nunca la ve.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-cols">
            <div>
              <span className="brand">
                <span className="brand-mark">B</span>
                Blerify
              </span>
              <p className="footer-about">
                Ejemplo de integración de verificación de identidad con Blerify. Entidad y datos
                ficticios, únicamente para demostración.
              </p>
            </div>
            <div className="footer-col">
              <h4>Demo</h4>
              <ul>
                <li><a href="#verificar">Verificar una credencial</a></li>
                <li><a href="/w3c">Regla W3C</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Estándares</h4>
              <ul>
                <li><a href="#como-funciona">OIDC4VP</a></li>
                <li><a href="#como-funciona">ISO 18013-5 (mDL)</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Seguridad</h4>
              <ul>
                <li><a href="#seguridad">Cómo se valida</a></li>
                <li><a href="#seguridad">Qué datos se piden</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>Ejemplo de integración · verificación con Blerify (OIDC4VP)</span>
            <span className="demo-note">Entidad y datos ficticios para demostración.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
