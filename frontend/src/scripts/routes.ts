import {createRouter, createWebHashHistory, createWebHistory, RouteRecordRaw} from 'vue-router';
import AppsView from '../views/AppsView.vue';
import StatusView from '../views/StatusView.vue';
import AudienceView from '../views/AudienceView.vue';
import LogView from '../views/LogView.vue';
import FeedbackView from '../views/FeedbackView.vue';
import SystemView from '../views/SystemView.vue';
import SettingsView from '../views/SettingsView.vue';
import ProfileView from '../views/ProfileView.vue';
import AudienceHistoryView from '../views/AudienceHistoryView.vue';
import {crashCourse} from './analytics';

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
		path: '/apps/:id/audience/day',
		name: 'audience-day',
		component: AudienceView
	},
	{
		path: '/apps/:id/audience/history',
		name: 'audience-history',
		component: AudienceHistoryView
	},
	{
		path: '/apps/:id/logs/:type',
		name: 'logs',
		component: LogView
	},
	{
		path: '/apps/:id/feedback',
		name: 'feedback',
		component: FeedbackView
	},
	{path: '/apps/:id/system', name: 'system', component: SystemView},
	{
		path: '/apps/:id/settings',
		name: 'settings',
		component: SettingsView
	},
	{
		path: '/profile',
		name: 'profile',
		component: ProfileView
	},
	{
		path: '/:pathname(.*)*',
		redirect: {
			name: 'home'
		}
	}
];

const router = createRouter({
	history: import.meta.env.VITE_ROUTER === 'hash' ? createWebHashHistory() : createWebHistory('/'),
	routes
});

router.afterEach(() => crashCourse.value?.sendHit());

export default router;
