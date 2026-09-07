import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'passenger-home',
    loadChildren: () => import('./pages/passenger-home/passenger-home.module').then(m => m.PassengerHomePageModule)
  },
  {
    path: 'passenger-ride',
    loadChildren: () => import('./pages/passenger-ride/passenger-ride.module').then(m => m.PassengerRidePageModule)
  },
  {
    path: 'owner-dashboard',
    loadChildren: () => import('./pages/owner-dashboard/owner-dashboard.module').then(m => m.OwnerDashboardPageModule)
  },
  {
    path: 'owner-ride',
    loadChildren: () => import('./pages/owner-ride/owner-ride.module').then(m => m.OwnerRidePageModule)
  },
  {
    path: 'admin-panel',
    loadChildren: () => import('./pages/admin-panel/admin-panel.module').then(m => m.AdminPanelPageModule)
  }
];

export const AppRoutingModule = RouterModule.forRoot(routes, { useHash: true });