import {createRouter, createWebHistory, RouteRecordRaw} from 'vue-router';
import AppsView from '../views/AppsView.vue';
import StatusView from '../views/StatusView.vue';
import AudienceView from '../views/AudienceView.vue';
import LogView from '../views/LogView.vue';
import SettingsView from '../views/SettingsView.vue';
import ProfileView from '../views/ProfileView.vue';
import FeedbackView from '../views/FeedbackView.vue';

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
		path: '/apps/:id/status',
		name: 'status',
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
		component: LogView
	},
	{
		path: '/apps/:id/settings',
		name: 'settings',
		component: SettingsView
	},
	{
		path: '/apps/:id/feedback',
		name: 'feedback',
		component: FeedbackView
	},
	{
		path: '/profile',
		name: 'profile',
		component: ProfileView
	}
];

const router = createRouter({
	history: createWebHistory('/'),
	routes
});

export default router;
