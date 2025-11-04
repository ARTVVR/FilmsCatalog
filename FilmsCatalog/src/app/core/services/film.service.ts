import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, shareReplay, throwError } from 'rxjs';
import type { Film } from '../models/film.model';

const API_URL = 'https://6909e8871a446bb9cc208c3a.mockapi.io/api';

@Injectable({ providedIn: 'root' })
export class FilmService {
  private readonly http = inject(HttpClient);
  private readonly filmsCache = new Map<string, Film[]>();

  getFilms(query?: string) {
    const key = query?.trim().toLowerCase() || '';

    if (this.filmsCache.has(key)) {
      return of(this.filmsCache.get(key)!);
    }

    const qRaw = (query || '').trim().toLowerCase();

    return this.http.get<Film[]>(`${API_URL}/films`).pipe(
      map((films) => {
        const normalizePoster = (url: string): string => {
          if (!url) return url;
          const tmdbPrefix = 'https://image.tmdb.org/t/p/';
          if (url.startsWith(tmdbPrefix)) {
            return `https://wsrv.nl/?w=342&h=513&fit=cover&output=webp&q=60&url=${encodeURIComponent(url)}`;
          }
          return url;
        };

        const items = qRaw
          ? films.filter((f) => f.title.toLowerCase().includes(qRaw))
          : films;

        for (const f of items) {
          f.poster = normalizePoster(f.poster);
        }

        this.filmsCache.set(key, items);
        return items;
      }),
      shareReplay(1),
      catchError((err) => throwError(() => err))
    );
  }

getFilmById(id: number | string) {
  return this.http.get<Film[]>(`${API_URL}/films?id=${id}`).pipe(
    map(films => {
      const film = films[0];
      if (!film) throw new Error(`Film with id=${id} not found`);

      if (film.poster?.startsWith('https://image.tmdb.org/t/p/')) {
        film.poster = `https://wsrv.nl/?w=342&h=513&fit=cover&output=webp&q=60&url=${encodeURIComponent(film.poster)}`;
      }

      return film;
    }),
    catchError((err) => throwError(() => err))
  );
}

}
