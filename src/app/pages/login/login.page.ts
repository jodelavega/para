import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';

  roles: { value: UserRole; label: string; icon: string; description: string }[] = [
    {
      value: 'passenger',
      label: 'Passenger',
      icon: 'person-outline',
      description: 'Request rides and travel'
    },
    {
      value: 'owner',
      label: 'Owner',
      icon: 'car-outline',
      description: 'Drive and earn money'
    },
    {
      value: 'administrator',
      label: 'Administrator',
      icon: 'shield-outline',
      description: 'Manage the platform'
    }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      role: ['passenger', [Validators.required]]
    });
  }

  ngOnInit() {}

  async onLogin() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    const { username, password, role } = this.loginForm.value;

    try {
      await this.authService.login(username, password, role);
      this.errorMessage = '';
      this.navigateToRole(role);
    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed. Please try again.';
    }
  }

  onRoleChange() {
    this.errorMessage = '';
  }

  private navigateToRole(role: UserRole) {
    switch (role) {
      case 'passenger':
        this.router.navigate(['/passenger-home']);
        break;
      case 'owner':
        this.router.navigate(['/owner-dashboard']);
        break;
      case 'administrator':
        this.router.navigate(['/admin-panel']);
        break;
    }
  }

  async showHelp() {
    const alert = await this.alertController.create({
      header: 'Demo Login',
      message: 'Select your role and use any username/password to login. This is a demo application.',
      buttons: ['OK']
    });
    await alert.present();
  }
}