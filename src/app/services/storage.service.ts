import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly USERS_XML_PATH = 'assets/users.xml';
  private readonly USERS_KEY = 'para_users';
  private readonly SESSION_USER_KEY = 'para_session_user';

  constructor(private http: HttpClient) {}

  async initializeData(): Promise<void> {
    const existingUsers = this.getUsersFromLocalStorage();
    if (!existingUsers || existingUsers.length === 0) {
      const usersFromXml = await this.loadUsersFromXml();
      this.saveUsersToLocalStorage(usersFromXml);
    }
  }

  private async loadUsersFromXml(): Promise<User[]> {
    try {
      const xmlString = await firstValueFrom(this.http.get(this.USERS_XML_PATH, { responseType: 'text' }));
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const usersNodes = xmlDoc.getElementsByTagName('user');
      const users: User[] = [];

      for (let i = 0; i < usersNodes.length; i++) {
        const node = usersNodes[i];
        const user: User = {
          id: this.getTagValue(node, 'id'),
          username: this.getTagValue(node, 'username'),
          password: this.getTagValue(node, 'password'),
          email: this.getTagValue(node, 'email'),
          role: this.getTagValue(node, 'role') as any,
          phone: this.getTagValue(node, 'phone'),
          createdAt: this.getTagValue(node, 'createdAt')
        };
        users.push(user);
      }
      return users;
    } catch (error) {
      console.error('Error loading users from XML:', error);
      return [];
    }
  }

  private getTagValue(node: Element, tagName: string): string {
    const element = node.getElementsByTagName(tagName)[0];
    return element ? element.textContent || '' : '';
  }

  // Users management
  getUsersFromLocalStorage(): User[] | null {
    const data = localStorage.getItem(this.USERS_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveUsersToLocalStorage(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  addUser(user: User): void {
    const users = this.getUsersFromLocalStorage() || [];
    users.push(user);
    this.saveUsersToLocalStorage(users);
  }

  // Session management
  setSessionUser(user: User): void {
    sessionStorage.setItem(this.SESSION_USER_KEY, JSON.stringify(user));
  }

  getSessionUser(): User | null {
    const data = sessionStorage.getItem(this.SESSION_USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.SESSION_USER_KEY);
  }

  // Generic storage helpers
  setItem(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getItem<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) as T : null;
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
