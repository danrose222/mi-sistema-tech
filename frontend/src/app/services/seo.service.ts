import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  setSeoData(title: string, description: string, image?: string) {
    const fullTitle = `${title} | CEL SHOP CENTER`;
    this.titleService.setTitle(fullTitle);
    
    this.metaService.updateTag({ name: 'description', content: description });
    
    // Open Graph para Redes Sociales
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    
    if (image) {
      this.metaService.updateTag({ property: 'og:image', content: image });
    }
  }
}
