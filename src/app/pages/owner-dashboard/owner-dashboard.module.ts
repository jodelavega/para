import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { OwnerDashboardPage } from './owner-dashboard.page';

const routes: Routes = [
  { path: '', component: OwnerDashboardPage }
];

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  declarations: [OwnerDashboardPage]
})
export class OwnerDashboardPageModule {}