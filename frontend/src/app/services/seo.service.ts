import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

// Coincide con FRONTEND_URL en backend/.env.production.example.
const SITE_URL = 'https://www.celshopcenter.com.ar';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  setSeoData(title: string, description: string, image?: string) {
    const fullTitle = `${title} | CEL SHOP CENTER`;
    const url = `${SITE_URL}${this.router.url}`;

    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({ name: 'description', content: description });

    // Open Graph para redes sociales (Facebook, WhatsApp, etc.)
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: url });

    // Twitter/X Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: description });

    if (image) {
      this.metaService.updateTag({ property: 'og:image', content: image });
      this.metaService.updateTag({ name: 'twitter:image', content: image });
    }

    this.actualizarCanonical(url);
  }

  private actualizarCanonical(url: string) {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
