<template lang="pug">
#audience(v-if="app")
	h1 {{app.name}} audience
	.row
		.card.accent.m-4(v-if="realtimeAudience")
			h2 Audience now
			TimedChart(:data="chartData" color="#ffffff" type="line" :yStacked="false")
			h3 Active users
			p#active-users.large {{currentUsers}}
		.card.m-4(v-if="todayAudience")
			h2 Audience today
			p Users
			p#today-users.large {{todayAudience.users}}
			p Sessions
			p#today-sessions.large {{todayAudience.sessions?.length}}
			p Bounce rate
			p#bounce-rate.large {{Math.round(todayAudience.bounceRate * 100)}}%
			p Average session
			p#session-duration.large {{avgSession(todayAudience.avgDuration)}}
		.card.m-4
			h2 Traffic
			h3 Most popular pages
			table.cells(v-if="pages")
				thead
					tr
						td Page
						td Views
				tbody
					tr(v-for="page of pages" :key="page.url")
						td
							a.underline(:href="page.url") {{page.url}}
						td {{page.hits}}
			h3 Top referrals
			table.cells(v-if="referrers")
				thead
					tr
						td Source
						td Count
				tbody
					tr(v-for="referrer of referrers" :key="referrer.url")
						td
							a.underline(:href="referrer.url || undefined") {{referrer.url || 'Unknown'}}
						td {{referrer.count}}
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';

import Api from '../scripts/api';
import type {App, DayAudience, RealtimeAudience} from '../scripts/types';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';

const route = useRoute();
const app = ref<App | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);

window.document.title = 'Audience | Crash Course';

const chartData = computed(() => [
	{
		label: 'Users',
		color: '#ef8105',
		data: realtimeAudience.value?.users
	},
	{
		label: 'Page views',
		color: '#44c40c',
		data: realtimeAudience.value?.views
	}
]);
const currentUsers = computed(() => {
	const keys = Object.keys(realtimeAudience.value.users);

	const lastInterval = keys.length ? keys[keys.length - 1] : null;
	return Date.now() - +lastInterval < 1000 * 60 ? realtimeAudience.value.users[lastInterval] : 0;
});

const pages = computed<{url: string; hits: number}[]>(() =>
	Object.keys(todayAudience.value?.pages ?? {})
		.sort((k1, k2) => todayAudience.value.pages[k2] - todayAudience.value.pages[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, hits: todayAudience.value.pages[k]};
		})
);
const referrers = computed<{url: string; count: number}[]>(() =>
	Object.keys(todayAudience.value?.referrers ?? {})
		.sort((k1, k2) => todayAudience.value.referrers[k2] - todayAudience.value.referrers[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, count: todayAudience.value.referrers[k]};
		})
);

function avgSession(seconds: number): string {
	return Math.floor((seconds / 60 / 1000) % 60) + 'm ' + Math.floor((seconds / 1000) % 60) + 's';
}

Api.apps
	.getByID(+route.params.id)
	.then((a) => (app.value = a))
	.catch((err) => alert('Failed to load the app', PopupColor.Red, err.message));

function loadAudience() {
	Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a));
	Api.apps.getTodayAudience(+route.params.id).then((a) => (todayAudience.value = a));
}

loadAudience();

const refreshInterval = setInterval(loadAudience, 1000 * 15);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped>
.row .card {
	flex-basis: 400px;
}
</style>
