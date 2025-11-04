import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith, switchMap, catchError, of, finalize, BehaviorSubject, combineLatest, map, tap } from 'rxjs';
import { FilmService } from '../../../core/services/film.service';
import { FilmDetailComponent } from '../../films/film-detail/film-detail.component';
import type { Film } from '../../../core/models/film.model';

interface HTMLImageElementWithFallback extends HTMLImageElement {
  __fallbackApplied?: boolean;
}

@Component({
  selector: 'app-films-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FilmDetailComponent],
  templateUrl: './films-list.component.html',
  styleUrls: ['./films-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilmsListComponent {
  private readonly filmService = inject(FilmService);

  readonly query = new FormControl('', { nonNullable: true });
  readonly isLoading = signal(false);
  readonly selectedFilmId = signal<number | null>(null);
  readonly page$ = new BehaviorSubject<number>(1);
  private readonly pageSize = 10;

  open(id: number) {
    this.selectedFilmId.set(id);
  }

  close() {
    this.selectedFilmId.set(null);
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

  readonly films$ = this.query.valueChanges.pipe(
    startWith(''),
    debounceTime(250),
    distinctUntilChanged(),
    tap(() => this.page$.next(1)),
    switchMap((q) => {
      this.isLoading.set(true);
      return this.filmService.getFilms(q).pipe(
        catchError(() => of([] as Film[])),
        finalize(() => this.isLoading.set(false)),
      );
    }),
    tap((films) => {
      if (typeof document !== 'undefined') {
        const topPosters = films.slice(0, 10).filter(f => f?.poster);
        topPosters.forEach((film) => {
          if (film.poster) {
            const existing = document.querySelector(`link[rel="preload"][href="${film.poster}"]`);
            if (existing) existing.remove();
            
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = film.poster;
            link.setAttribute('fetchpriority', 'high');
            document.head.appendChild(link);
          }
        });
      }
    })
  );

  readonly totalPages$ = this.films$.pipe(map((films) => Math.max(1, Math.ceil(films.length / this.pageSize))));

  readonly pagedFilms$ = combineLatest([this.films$, this.page$]).pipe(
    map(([films, page]) => {
      const start = (page - 1) * this.pageSize;
      const sliced = films.slice(start, start + this.pageSize);
      if (sliced.length > 0 && typeof document !== 'undefined') {
        const topPosters = sliced.slice(0, 10).filter(f => f?.poster);
        topPosters.forEach((film) => {
          if (film.poster && !document.querySelector(`link[rel="preload"][href="${film.poster}"]`)) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = film.poster;
            link.setAttribute('fetchpriority', 'high');
            document.head.appendChild(link);
          }
        });
      }
      return sliced;
    }),
  );

  trackByFilmId(index: number, film: Film): number {
    return film.id;
  }

  buildPosterSrcSet(url: string): string {
    if (!url) return '';
    const small = url.replace(/w=\d+/g, 'w=200').replace(/h=\d+/g, 'h=300');
    const medium = url.replace(/w=\d+/g, 'w=342').replace(/h=\d+/g, 'h=513');
    const large = url.replace(/w=\d+/g, 'w=400').replace(/h=\d+/g, 'h=600');
    return `${small} 200w, ${medium} 342w, ${large} 400w`;
  }

  posterSizes = '(max-width: 600px) 200px, (max-width: 1200px) 342px, 400px';

  nextPage(totalPages: number) {
    const current = this.page$.value;
    if (current < totalPages) {
      this.page$.next(current + 1);
      this.prefetchNextPage(current + 1);
    }
  }

  private prefetchNextPage(page: number) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.films$.subscribe((films) => {
          const start = page * this.pageSize;
          const end = start + this.pageSize;
          const nextPageFilms = films.slice(start, end);
          nextPageFilms.forEach((film) => {
            if (film.poster && !document.querySelector(`link[href="${film.poster}"]`)) {
              const link = document.createElement('link');
              link.rel = 'prefetch';
              link.as = 'image';
              link.href = film.poster;
              document.head.appendChild(link);
            }
          });
        }).unsubscribe();
      });
    }
  }

  prevPage() {
    const current = this.page$.value;
    if (current > 1) this.page$.next(current - 1);
  }
}
