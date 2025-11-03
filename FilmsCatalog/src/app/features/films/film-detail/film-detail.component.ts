import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilmService } from '../../../core/services/film.service';
import type { Film } from '../../../core/models/film.model';
import { Observable, of } from 'rxjs';

interface HTMLImageElementWithFallback extends HTMLImageElement {
  __fallbackApplied?: boolean;
}

@Component({
  selector: 'app-film-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './film-detail.component.html',
  styleUrls: ['./film-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilmDetailComponent implements OnChanges {
  private readonly filmService = inject(FilmService);

  @Input() filmId: number | null = null;

  film$: Observable<Film | null> = of(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filmId'] && this.filmId != null) {
      this.film$ = this.filmService.getFilmById(this.filmId);
    }
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElementWithFallback;
    if (!img || img.__fallbackApplied) return;
    img.__fallbackApplied = true;
    const current = img.currentSrc || img.src || '';
    if (current.includes('wsrv.nl') && current.includes('output=webp')) {
      img.src = current.replace('output=webp', 'output=jpg');
      return;
    }
    if (current.includes('wsrv.nl') && current.includes('&q=')) {
      img.src = current.replace(/&q=\d+/g, '');
      return;
    }
    img.src = 'https://placehold.co/342x513?text=No+Image';
  }

  buildPosterSrcSet(url: string): string {
    if (!url) return '';
    const medium = url.replace(/w=\d+/g, 'w=342').replace(/h=\d+/g, 'h=513');
    const large = url.replace(/w=\d+/g, 'w=400').replace(/h=\d+/g, 'h=600');
    return `${medium} 342w, ${large} 400w`;
  }

  detailPosterSizes = '(max-width: 600px) 200px, 342px';
}
