import {createRouter, createWebHistory, RouteRecordRaw} from 'vue-router';
import AppView from '../views/AppView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'home',
		redirect: {
			name: 'apps'
		}
	},
	{
		path: '/apps',
		name: 'apps',
		component: AppView
	},
	{
		path: '/settings',
		name: 'settings',
		component: SettingsView
	}
];

const router = createRouter({
	history: createWebHistory('/'),
	routes
});

export default router;
