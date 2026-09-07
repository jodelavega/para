import { Component, OnInit } from '@angular/core';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  styles: ['']
})
export class AppComponent implements OnInit {
  constructor(private storageService: StorageService) {}

  async ngOnInit() {
    await this.storageService.initializeData();
  }
}
