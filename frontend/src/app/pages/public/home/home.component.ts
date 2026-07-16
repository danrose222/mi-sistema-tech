import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PublicApiService } from '../../../services/public-api.service';
import { SeoService } from '../../../services/seo.service';
import { ProductoCardComponent } from '../../../components/producto-card/producto-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule, ProductoCardComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <div class="hero-grid"></div>
      <div class="hero-glow hero-glow--a"></div>
      <div class="hero-glow hero-glow--b"></div>
      <div class="hero-visual" aria-hidden="true">
        <div class="device-field">
          <svg class="device-svg device-laptop-svg" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 20h140a6 6 0 0 1 6 6v90H34V26a6 6 0 0 1 6-6Z" stroke="var(--signal)" stroke-width="2"/>
            <rect x="52" y="34" width="116" height="70" rx="3" stroke="var(--signal)" stroke-width="1.3" opacity="0.55"/>
            <path d="M10 130h200l-14 20H24l-14-20Z" stroke="var(--signal)" stroke-width="2" stroke-linejoin="round"/>
            <line x1="95" y1="130" x2="125" y2="130" stroke="var(--signal)" stroke-width="2" stroke-linecap="round"/>
          </svg>

          <svg class="device-svg device-phone-svg" viewBox="0 0 120 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="112" height="232" rx="24" stroke="var(--signal)" stroke-width="2.5"/>
            <rect x="16" y="26" width="88" height="188" rx="4" stroke="var(--signal)" stroke-width="1.2" opacity="0.5"/>
            <circle cx="60" cy="16" r="2.4" fill="var(--signal)"/>
            <line x1="44" y1="226" x2="76" y2="226" stroke="var(--signal)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>

          <svg class="device-svg device-headphones-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 80V60a60 60 0 0 1 120 0v20" stroke="var(--signal)" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="6" y="74" width="30" height="46" rx="14" stroke="var(--signal)" stroke-width="2.5"/>
            <rect x="124" y="74" width="30" height="46" rx="14" stroke="var(--signal)" stroke-width="2.5"/>
          </svg>
        </div>
      </div>

      <div class="hero-inner">
        <span class="hero-badge">
          <span class="pulse-dot"></span>
          Tecnología al mejor precio · Envío a todo el país
        </span>
        <h1>El futuro de la tecnología<br><span class="text-gradient">está en tus manos.</span></h1>
        <p class="hero-sub">Financiación en cuotas sin interés · Envío gratis a todo el país · Garantía oficial de 12 meses.</p>
        <div class="hero-actions">
          <a routerLink="/productos" class="btn-primary btn-lg">
            Explorar catálogo
            <mat-icon inline>arrow_forward</mat-icon>
          </a>
          <a href="#destacados" class="btn-ghost btn-lg">Ver destacados</a>
        </div>
      </div>
    </section>

    <!-- TRUST STRIP -->
    <section class="trust-strip">
      <div class="trust-inner">
        <div class="trust-item">
          <div class="trust-icon"><mat-icon>local_shipping</mat-icon></div>
          <div>
            <strong>Envío gratis</strong>
            <span>En compras +$100.000</span>
          </div>
        </div>
        <div class="trust-item">
          <div class="trust-icon"><mat-icon>credit_score</mat-icon></div>
          <div>
            <strong>Cuotas sin interés</strong>
            <span>Todas las tarjetas</span>
          </div>
        </div>
        <div class="trust-item">
          <div class="trust-icon"><mat-icon>verified</mat-icon></div>
          <div>
            <strong>Garantía oficial</strong>
            <span>12 meses</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURED PRODUCTS -->
    <section class="section" id="destacados">
      <div class="section-inner">
        <div class="section-header">
          <h2>Productos destacados</h2>
          <a routerLink="/productos" class="see-all">Ver todos <mat-icon inline>arrow_forward</mat-icon></a>
        </div>

        <div class="product-grid">
          @for (prod of destacados(); track prod.id) {
            <app-producto-card [producto]="prod"></app-producto-card>
          } @empty {
            @for (i of [1,2,3,4]; track i) {
              <div class="skeleton"></div>
            }
          }
        </div>
      </div>
    </section>

    <!-- POR QUÉ ELEGIRNOS -->
    <section class="section section--alt">
      <div class="section-inner">
        <div class="section-header section-header--center">
          <h2>Por qué elegirnos</h2>
          <p class="section-sub">La forma más simple y segura de renovar tu tecnología.</p>
        </div>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon"><mat-icon>bolt</mat-icon></div>
            <h3>Entrega rápida</h3>
            <p>Despachamos en 24-48hs a todo el país, con seguimiento en tiempo real.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><mat-icon>credit_score</mat-icon></div>
            <h3>Llevalo con tu DNI</h3>
            <p>Financiación en cuotas con solo DNI. Aprobación rápida.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><mat-icon>verified_user</mat-icon></div>
            <h3>Garantía oficial</h3>
            <p>12 meses de garantía y devolución gratuita dentro de los 30 días.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon"><mat-icon>support_agent</mat-icon></div>
            <h3>Atención personalizada</h3>
            <p>Te acompañamos por WhatsApp antes, durante y después de tu compra.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA FINAL -->
    <section class="cta-banner">
      <div class="cta-glow"></div>
      <div class="cta-inner">
        <h2>¿Buscás algo puntual?</h2>
        <p>Recorré todo nuestro catálogo de celulares, notebooks y accesorios.</p>
        <a routerLink="/productos" class="btn-primary btn-lg">Ver catálogo completo</a>
      </div>
    </section>
  `,
  styles: [`
    /* ── Hero ────────────────────────────── */
    .hero {
      position: relative;
      overflow: hidden;
      padding: 120px 24px 96px;
      background: var(--void);
    }
    .hero-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(0, 174, 239, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 174, 239, 0.06) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
    }
    .hero-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      pointer-events: none;
    }
    .hero-glow--a {
      width: 480px; height: 480px;
      top: -160px; right: -80px;
      background: radial-gradient(circle, rgba(0, 174, 239, 0.35) 0%, transparent 70%);
      animation: floatGlow 9s ease-in-out infinite;
    }
    .hero-glow--b {
      width: 380px; height: 380px;
      bottom: -140px; left: 5%;
      background: radial-gradient(circle, rgba(79, 214, 255, 0.18) 0%, transparent 70%);
      animation: floatGlow 11s ease-in-out infinite reverse;
    }
    @keyframes floatGlow {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-24px, 24px); }
    }
    /* Composición del hero: ecosistema de dispositivos como trazos SVG
       holográficos (stroke --signal + drop-shadow) flotando sobre el campo
       de fuerza radial. */
    .hero-visual {
      position: absolute;
      top: 50%;
      right: -4%;
      transform: translateY(-50%);
      width: 620px;
      height: 620px;
      pointer-events: none;
    }
    .device-field {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 52% 48%, rgba(0, 174, 239, 0.18) 0%, rgba(0, 174, 239, 0.05) 45%, transparent 72%);
    }
    .device-svg {
      position: absolute;
      overflow: visible;
    }
    .device-laptop-svg {
      width: 300px;
      bottom: 70px;
      right: -10px;
      filter: drop-shadow(0 0 18px rgba(0, 174, 239, 0.45));
      animation: floatLaptop 9s ease-in-out infinite;
    }
    .device-phone-svg {
      width: 140px;
      top: 76px;
      right: 160px;
      filter: drop-shadow(0 0 16px rgba(0, 174, 239, 0.5));
      animation: floatPhone 7s ease-in-out infinite;
    }
    .device-headphones-svg {
      width: 160px;
      top: 4px;
      right: 300px;
      filter: drop-shadow(0 0 16px rgba(0, 174, 239, 0.4));
      animation: floatHeadphones 8s ease-in-out infinite;
    }
    @keyframes floatPhone {
      0%, 100% { transform: translateY(0) rotate(-8deg); }
      50% { transform: translateY(-16px) rotate(-8deg); }
    }
    @keyframes floatLaptop {
      0%, 100% { transform: translateY(0) rotate(5deg); }
      50% { transform: translateY(14px) rotate(5deg); }
    }
    @keyframes floatHeadphones {
      0%, 100% { transform: translateY(0) rotate(6deg); }
      50% { transform: translateY(-12px) rotate(6deg); }
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      border-radius: 100px;
      background: rgba(0, 174, 239, 0.08);
      border: 1px solid rgba(0, 174, 239, 0.3);
      color: var(--pulse);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      margin-bottom: 24px;
    }
    .pulse-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--signal);
      box-shadow: 0 0 0 0 rgba(0, 174, 239, 0.6);
      animation: pulseDot 2s infinite;
    }
    @keyframes pulseDot {
      0% { box-shadow: 0 0 0 0 rgba(0, 174, 239, 0.5); }
      70% { box-shadow: 0 0 0 8px rgba(0, 174, 239, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 174, 239, 0); }
    }
    .hero h1 {
      font-family: var(--font-display);
      font-size: 4rem;
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: var(--white);
      margin: 0 0 20px 0;
      max-width: 720px;
    }
    .text-gradient {
      background: linear-gradient(90deg, var(--signal), var(--pulse));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .hero-sub {
      color: var(--ash);
      font-size: 1.1rem;
      line-height: 1.6;
      margin: 0 0 36px 0;
      max-width: 520px;
    }
    .hero-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn-lg { padding: 14px 32px; font-size: 1rem; }

    /* ── Microinteracciones: entrada sutil al cargar ─────── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .hero-badge { animation: fadeInUp 0.6s ease both; }
    .hero h1 { animation: fadeInUp 0.6s ease 0.08s both; }
    .hero-sub { animation: fadeInUp 0.6s ease 0.16s both; }
    .hero-actions { animation: fadeInUp 0.6s ease 0.24s both; }

    /* ── Trust strip ────────────────────── */
    .trust-strip {
      position: relative;
      z-index: 1;
      border-bottom: 1px solid var(--border-dim);
    }
    .trust-inner {
      display: flex;
      max-width: 1200px;
      margin: -40px auto 0;
      padding: 0 24px;
      background: var(--surface-glass);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-lg);
    }
    .trust-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 24px;
      animation: fadeInUp 0.5s ease both;
    }
    .trust-item:nth-child(1) { animation-delay: 0.1s; }
    .trust-item:nth-child(2) { animation-delay: 0.17s; }
    .trust-item:nth-child(3) { animation-delay: 0.24s; }
    .trust-item:not(:last-child) {
      border-right: 1px solid var(--border-dim);
    }
    .trust-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      flex-shrink: 0;
      border-radius: var(--radius-sm);
      background: rgba(0, 174, 239, 0.1);
      box-shadow: inset 0 0 14px rgba(0, 174, 239, 0.28);
    }
    .trust-icon mat-icon {
      color: var(--signal);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .trust-item strong {
      display: block;
      color: var(--white);
      font-size: 0.96rem;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .trust-item span {
      color: var(--ash);
      font-size: 0.87rem;
    }

    /* ── Sections ────────────────────────── */
    .section {
      padding: 88px 0 72px;
      position: relative;
      z-index: 1;
    }
    .section--alt {
      background-color: var(--slate);
      border-top: 1px solid var(--border-dim);
    }
    .section-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 36px;
    }
    .section-header--center {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }
    .section-header h2 {
      font-family: var(--font-display);
      font-size: 1.9rem;
      font-weight: 700;
      color: var(--white);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .section-sub {
      color: var(--ash);
      margin: 0;
      font-size: 1rem;
    }
    .see-all {
      color: var(--pulse);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s;
    }
    .see-all:hover { color: var(--signal); }

    /* Product grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 24px;
    }
    .product-grid > * {
      animation: fadeInUp 0.5s ease both;
    }
    .product-grid > *:nth-child(1) { animation-delay: 0.05s; }
    .product-grid > *:nth-child(2) { animation-delay: 0.1s; }
    .product-grid > *:nth-child(3) { animation-delay: 0.15s; }
    .product-grid > *:nth-child(4) { animation-delay: 0.2s; }
    .product-grid > *:nth-child(n+5) { animation-delay: 0.25s; }
    .skeleton {
      height: 380px;
      background: var(--slate);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-md);
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }

    /* Feature grid (Por qué elegirnos) */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 20px;
    }
    .feature-card {
      background: var(--void);
      border: 1px solid var(--border-dim);
      border-radius: var(--radius-lg);
      padding: 32px 24px;
      transition: border-color 0.2s ease, transform 0.2s ease;
      animation: fadeInUp 0.5s ease both;
    }
    .feature-card:nth-child(1) { animation-delay: 0.05s; }
    .feature-card:nth-child(2) { animation-delay: 0.12s; }
    .feature-card:nth-child(3) { animation-delay: 0.19s; }
    .feature-card:nth-child(4) { animation-delay: 0.26s; }
    .feature-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-4px);
    }
    .feature-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      background: rgba(0, 174, 239, 0.1);
      margin-bottom: 20px;
    }
    .feature-icon mat-icon {
      color: var(--signal);
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .feature-card h3 {
      font-family: var(--font-display);
      color: var(--white);
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .feature-card p {
      color: var(--ash);
      font-size: 0.88rem;
      line-height: 1.6;
      margin: 0;
    }

    /* ── CTA banner ─────────────────────── */
    .cta-banner {
      position: relative;
      overflow: hidden;
      padding: 80px 24px;
      text-align: center;
      background: var(--void);
      border-top: 1px solid var(--border-dim);
    }
    .cta-glow {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 700px; height: 300px;
      background: radial-gradient(ellipse, rgba(0, 174, 239, 0.15) 0%, transparent 70%);
      filter: blur(40px);
      pointer-events: none;
    }
    .cta-inner {
      position: relative;
      z-index: 1;
      max-width: 560px;
      margin: 0 auto;
    }
    .cta-inner h2 {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      color: var(--white);
      margin: 0 0 12px 0;
    }
    .cta-inner p {
      color: var(--ash);
      margin: 0 0 32px 0;
    }

    /* ── Responsive ──────────────────────── */
    @media (max-width: 900px) {
      .hero-visual { opacity: 0.5; width: 480px; height: 480px; right: -12%; }
    }
    @media (max-width: 768px) {
      .hero h1 { font-size: 2.5rem; }
      .hero { padding: 72px 24px 64px; }
      .trust-inner { flex-direction: column; margin-top: -24px; }
      .trust-item:not(:last-child) {
        border-right: none;
        border-bottom: 1px solid var(--border-dim);
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private api = inject(PublicApiService);
  private seo = inject(SeoService);

  destacados = signal<any[]>([]);

  ngOnInit() {
    this.seo.setSeoData('Inicio', 'CEL SHOP CENTER - Tu tienda de tecnología líder con los mejores precios en celulares, laptops y accesorios.');

    this.api.getProductos(1, 8).subscribe({
      next: (res) => {
        this.destacados.set(res.data || []);
      }
    });
  }
}
