import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Products } from './components/products/products';
import { ProductDetails } from './components/product-details/product-details';
import { Categories } from './components/categories/categories';

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
    },
    {
        path:'products/:id',
        component: ProductDetails
    },
    {
        path : 'categories',
        component : Categories
    },
];
