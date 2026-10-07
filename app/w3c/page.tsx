import VerificationPanel from '../components/VerificationPanel';
import ThemeToggle from '../components/ThemeToggle';

export const metadata = {
  title: 'Verificación W3C con DCQL — Blerify (demo)',
};

// Ruta de PRUEBA para una regla de verificación de tipo W3C con DCQL, separada del flujo
// principal. Reutiliza el mismo panel apuntándolo al BFF /api/w3c (regla W3C_RULE_ID).
export default function W3CVerifyPage() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="/">
            <span className="brand-mark">B</span>
            Blerify
          </a>
          <nav className="nav-links">
            <a href="/">Flujo principal (mDL)</a>
          </nav>
          <div className="nav-right">
            <span className="demo-pill">Demo · W3C DCQL</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">Verificación W3C</span>
            <h1>
              Presenta una credencial <span className="accent">W3C con DCQL</span>
            </h1>
            <p className="hero-lead">
              Ruta de prueba para validar una regla de verificación de tipo W3C (OpenID4VP 1.0 con
              consulta DCQL). Presenta una credencial W3C (JWT-VC) desde tu billetera y revisa los
              atributos verificados.
            </p>
            <div className="hero-meta">
              <div className="stat">
                <b>OpenID4VP 1.0</b>
                <span>Con consulta DCQL</span>
              </div>
              <div className="stat">
                <b>JWT-VC</b>
                <span>Credencial W3C</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="bank-card" aria-hidden="true">
              <div className="bc-top">
                <span>Blerify</span>
                <span className="chip" />
              </div>
              <div className="bc-number">W3C&nbsp;&nbsp;Verifiable&nbsp;&nbsp;Credential</div>
              <div className="bc-bottom">
                <div>
                  <div className="lbl">Formato</div>
                  <div>jwt_vc_json</div>
                </div>
                <div style={{ fontWeight: 800, letterSpacing: '0.04em' }}>DCQL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container enroll-grid">
          <div className="enroll-copy">
            <h2>Tres pasos, sin formularios</h2>
            <p>
              El mismo panel del flujo principal, apuntado a la regla W3C del BFF. Lo único que
              cambia es la credencial que se pide.
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
                  <b>Presenta la credencial W3C</b>
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
          <VerificationPanel
            apiBase="/api/w3c"
            title="Verificación W3C (DCQL)"
            subtitle="Presenta una credencial W3C desde tu billetera"
            credentialHint="Necesitas una credencial W3C en tu billetera digital."
          />
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <span>Ejemplo de integración · verificación con Blerify (OIDC4VP)</span>
            <span className="demo-note">Entidad y datos ficticios para demostración.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
