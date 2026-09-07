import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { OwnerRidePage } from './owner-ride.page';

const routes: Routes = [
  { path: '', component: OwnerRidePage },
  { path: ':id', component: OwnerRidePage }
];

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  declarations: [OwnerRidePage]
})
export class OwnerRidePageModule {}
