import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { PassengerRidePage } from './passenger-ride.page';

const routes: Routes = [
  { path: ':id', component: PassengerRidePage }
];

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule.forChild(routes)
  ],
  declarations: [PassengerRidePage]
})
export class PassengerRidePageModule {}