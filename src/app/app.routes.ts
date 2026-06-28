import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Products } from './components/products/products';
import { ProductDetails } from './components/product-details/product-details';
import { Categories } from './components/categories/categories';
import { Contact} from './components/contact/contact'
import { SignIn } from './components/sign-in/sign-in';
import { SignUp } from './components/sign-up/sign-up';
import { Cart } from './components/cart/cart';
import { Favorites } from './components/favorites/favorites';

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
        path: 'products/category/:category',
        component: Products
    },
    {
        path:'products/:id',
        component: ProductDetails
    },
    {
        path : 'categories',
        component : Categories
    },
    {
        path:'contact',
        component : Contact
    },
    {
        path : 'sign-in',
        component : SignIn
    },
    {
        path : 'signup',
        component : SignUp
    },
    {
        path : 'cart',
        component : Cart
    },
    {
        path : 'favorites',
        component : Favorites
    },
];
