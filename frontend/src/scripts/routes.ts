import {createRouter, createWebHistory, RouteRecordRaw} from 'vue-router';
import AppsView from '../views/AppsView.vue';
import StatusView from '../views/StatusView.vue';
import AudienceView from '../views/AudienceView.vue';
import LogsView from '../views/LogsView.vue';
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
		component: AppsView
	},
	{
		path: '/apps/:id/overview',
		name: 'overview',
		component: StatusView
	},
	{
		path: '/apps/:id/audience',
		name: 'audience',
		component: AudienceView
	},
	{
		path: '/apps/:id/logs/:type',
		name: 'logs',
		component: LogsView
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
