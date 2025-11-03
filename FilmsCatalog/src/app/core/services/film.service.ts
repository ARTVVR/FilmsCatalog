import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of, shareReplay, throwError } from 'rxjs';
import type { Film } from '../models/film.model';

const API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class FilmService {
  private readonly http = inject(HttpClient);

  private readonly filmsCache = new Map<string, Film[]>();

  getFilms(query?: string) {
    const key = `${query?.trim().toLowerCase() || ''}`;

    if (this.filmsCache.has(key)) {
      return of(this.filmsCache.get(key)!);
    }

    const params = new HttpParams().set('_sort', 'title').set('_order', 'asc');
    const qRaw = (query || '').trim();

    return this.http.get<Film[]>(`${API_URL}/films`, { params }).pipe(
      map((films) => {
        const normalizePoster = (url: string): string => {
          if (!url) return url;
          const tmdbPrefix = 'https://image.tmdb.org/t/p/';
          if (url.startsWith(tmdbPrefix)) {
            const proxied = `https://wsrv.nl/?w=342&h=513&fit=cover&output=webp&q=60&url=${encodeURIComponent(url)}`;
            return proxied;
          }
          return url;
        };
        const items = qRaw
          ? films.filter((f) => f.title.toLowerCase().includes(qRaw.toLowerCase()))
          : films;
        for (const f of items) {
          // rewrite poster to open proxy if it is TMDB
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f as any).poster = normalizePoster((f as any).poster);
        }
        this.filmsCache.set(key, items);
        return items;
      }),
      shareReplay(1),
      catchError((err) => throwError(() => err)),
    );
  }

  getFilmById(id: number) {
    return this.http.get<Film>(`${API_URL}/films/${id}`).pipe(
      map((film) => {
        const tmdbPrefix = 'https://image.tmdb.org/t/p/';
        const poster = (film as unknown as { poster?: string }).poster || '';
        if (poster.startsWith(tmdbPrefix)) {
          (film as unknown as { poster: string }).poster = `https://wsrv.nl/?w=342&h=513&fit=cover&output=webp&q=60&url=${encodeURIComponent(poster)}`;
        }
        return film;
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }
}
