<template lang="pug">
#audience(v-if="!!app")
	h1 {{app.name}} audience
	.flex.flex-wrap.justify-center
		.card.accent(v-if="realtimeAudience")
			h2 Audience now
			TimedChart(:data="viewsChart" color="#ffffff")
			h3 Active users
			p#active-users.accent {{realtimeAudience.currentUsers}}
			h3 Most popular pages
			table
				thead
					tr
						td Page
						td Views
				tbody
					tr(v-for="page of pages" :key="page.url")
						td
							a(:href="page.url") {{page.url}}
						td {{page.hits}}
			RouterLink.bold(:to="{name: 'realtime', params: {id: $route.params.id}}") Full report
		.card(v-if="todayAudience")
			h2 Audience today
			p Users
			p#today-users.large {{todayAudience.users}}
			p Sessions
			p#today-sessions.large {{todayAudience.sessions?.length}}
			p Bounce rate
			p#bounce-rate.large {{Math.round(todayAudience.bounceRate * 100)}}%
			p Average session
			p#session-duration.large {{avgSession(todayAudience.avgDuration)}}
		//a.bold(href="/today/" + website.id) Full report
		//div
			h2 Top referrals
			table
				thead
					tr
						td Source
						td Count
				tbody#top-referrals
		//div
			h2 Top Locations
			table
				thead
					tr
						td Location
						td Count
				tbody#top-locations
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';

import Api from '../scripts/api';
import type {App, DayAudience, RealtimeAudience} from '../scripts/types';
import TimedChart from '../components/TimedChart.vue';

const route = useRoute();
const app = ref<App | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);

const viewsChart = computed(() => [
	{
		label: 'Page views',
		color: '#44c40c',
		data: realtimeAudience.value.sessions
	}
]);

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a));
const interval = setInterval(
	() => Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a)),
	1000 * 30
);
Api.apps.getTodayAudience(+route.params.id).then((a) => (todayAudience.value = a));

const pages = computed<{url: string; hits: number}[]>(() =>
	Object.keys(realtimeAudience.value.pages)
		.sort((k1, k2) => realtimeAudience.value.pages[k2] - realtimeAudience.value.pages[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, hits: realtimeAudience.value.pages[k]};
		})
);

function avgSession(seconds: number): string {
	return Math.floor((seconds / 60 / 1000) % 60) + 'm ' + Math.floor((seconds / 1000) % 60) + 's';
}

onUnmounted(() => clearInterval(interval));
</script>

<style scoped></style>
