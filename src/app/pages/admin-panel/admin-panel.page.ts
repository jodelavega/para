import { Component, OnInit } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { DataService, AdminSettings } from "../../services/data.service";
import { OwnerInfo } from "../../models/user.model";
import { User } from "../../models/user.model";
import { VehicleCategoryInfo, DEFAULT_CATEGORIES } from "../../models/vehicle.model";

@Component({
  selector: "app-admin-panel",
  templateUrl: "./admin-panel.page.html",
  styleUrls: ["./admin-panel.page.scss"],
})
export class AdminPanelPage implements OnInit {
  activeTab: string = "categories";
  settings: AdminSettings;
  owners: OwnerInfo[] = [];
  users: User[] = [];

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private alertController: AlertController,
    private router: Router
  ) {
    this.settings = this.dataService.getSettings();
  }

  ngOnInit() {
    this.owners = this.dataService.getOwners();
    this.users = this.dataService.getUsers();
  }

  setTab(event: any) {
    this.activeTab = event.detail.value;
  }

  resetCategories() {
    this.settings.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    this.dataService.updateSettings(this.settings);
    this.presentToast("Categories reset to defaults");
  }

  saveCategory(index: number) {
    this.dataService.updateSettings(this.settings);
    this.presentToast("Category saved successfully");
  }

  saveOwner(owner: OwnerInfo) {
    this.dataService.updateOwner(owner);
    this.presentToast("Owner info saved");
  }

  removeOwner(userId: string) {
    this.dataService.removeOwner(userId);
    this.owners = this.dataService.getOwners();
    this.presentToast("Owner removed");
  }

  savePricing() {
    this.dataService.updateSettings(this.settings);
    this.presentToast("Pricing settings saved");
  }

  saveSettings() {
    this.dataService.updateSettings(this.settings);
    this.presentToast("System settings saved");
  }

  addNewUser() {
    const newUser: User = {
      id: "user-" + Date.now(),
      username: "newuser",
      email: "new@para.com",
      role: "passenger",
      phone: "+1 (555) 000-0000"
    };
    this.dataService.addUser(newUser);
    this.users = this.dataService.getUsers();
  }

  updateUser(user: User) {
    this.dataService.updateUser(user);
    this.presentToast("User updated");
  }

  removeUser(userId: string) {
    this.dataService.removeUser(userId);
    this.users = this.dataService.getUsers();
    this.presentToast("User removed");
  }

  logout() {
    this.authService.logout();
    this.router.navigate(["/login"]);
  }

  private async presentToast(message: string) {
    const alert = await this.alertController.create({
      header: "Success",
      message: message,
      buttons: ["OK"]
    });
    await alert.present();
  }
}
