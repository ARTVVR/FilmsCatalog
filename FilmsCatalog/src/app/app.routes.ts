import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/films/films-list/films-list.component').then((m) => m.FilmsListComponent),
  },
  {
    path: 'film/:id',
    loadComponent: () =>
      import('./features/films/film-detail/film-detail.component').then(
        (m) => m.FilmDetailComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
