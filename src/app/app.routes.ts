import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Products } from './components/products/products';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: Home
    },
    {
        path : 'products',
        component : Products
    }
];
