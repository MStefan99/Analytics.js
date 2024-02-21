<template lang="pug">
#audience(v-if="app")
	h1 {{app.name}} audience
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-input") Audience on
			DatePicker#date-input.w-full(v-model="startTime" @change="loadAudience()")
	.row
		.card.accent.m-0(v-if="today && realtimeAudience")
			h2 Audience now
			TimedChart(:data="realtimeDataset" color="#ffffff" :y-stacked="false" :step-size="1000 * 60")
			h3 Active users
			p#active-users.large {{currentUsers}}
		.card.m-0(v-if="todayAudience")
			h2(v-if="today") Audience today
			h2(v-else) Audience on {{startTime.toDateString()}}
			.today-audience
				.audience-section
					p Users
					p#today-users.large {{todayAudience.users}}
				.audience-section
					p Sessions
					p#today-sessions.large {{todayAudience.sessions?.length}}
				.audience-section
					p Page views
					p#today-views.large {{todayAudience.views}}
				.audience-section
					p Bounce rate
					p#bounce-rate.large {{Math.round(todayAudience.bounceRate * 100)}}%
				.audience-section
					p Average session
					p#session-duration.large {{formatTime(todayAudience.avgDuration)}}
		.card.m-0
			h2(v-if="today") Traffic today
			h2(v-else) Traffic on {{startTime.toDateString()}}
			h3 Most popular pages
			table.cells(v-if="pages")
				thead
					tr
						th Page
						th Views
				tbody
					tr(v-for="page of pages" :key="page.url")
						td.break-all
							a.underline(:href="page.url") {{page.url}}
						td {{page.hits}}
			h3 Top referrers
			table.cells(v-if="referrers")
				thead
					tr
						th Source
						th Count
				tbody
					tr(v-for="referrer of referrers.filter(r => r.url.length)" :key="referrer.url")
						td.break-all
							a.underline(:href="referrer.url") {{referrer.url}}
						td {{referrer.count}}
		.card.sessions.m-0(v-if="todayAudience")
			h2(v-if="today") Sessions today
			h2(v-else) Sessions on {{startTime.toDateString()}}
			.row
				.session(v-for="(session, i) in todayAudience.sessions" :key="session.id")
					h3 Session {{i + 1}}
					p Device: {{parseUA(session.ua)}}
					b(v-if="session.pages.length < 2") Bounced
					p(v-else) Duration: {{formatTime(session.duration)}}
					p Referrer:
						|
						|
						a.underline(:href="session.pages[0].referrer || undefined") {{session.pages[0].referrer || 'Unknown'}}
					h4 Pages
					table.cells
						thead
							th URL
							th(v-if="session.pages.length > 1") Viewed for
						tbody
							tr(v-for="(page, p) in session.pages" :key="p")
								td.break-all
									a.underline(:href="page.url") {{page.url}}
								td(v-if="p < session.pages.length - 1") {{formatTime(session.pages[p + 1].time - page.time)}}
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';

import Api from '../scripts/api';
import type {App, DayAudience, RealtimeAudience} from '../scripts/types';
import DatePicker from '../components/DatePicker.vue';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';
import {useQuery} from '../scripts/composables';
import {parseUA} from '../scripts/util';

const dayLength = 1000 * 60 * 60 * 24;
const route = useRoute();
const app = ref<App | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);
const startTime = ref<Date>(new Date());
startTime.value.setHours(0, 0, 0, 0);

const {query} = useQuery(
	computed(() => ({
		start: startTime.value.toISOString()
	}))
);
startTime.value = new Date(
	Array.isArray(query.value.start) ? query.value.start[0] : query.value.start
);
const today = computed(() => Date.now() - startTime.value.getTime() < dayLength);

const realtimeDataset = computed(() => [
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

function formatTime(time: number): string {
	const sec = Math.floor((time /= 1000) % 60);
	const min = Math.floor((time /= 60) % 60);
	const hours = Math.floor((time /= 60) % 24);
	const days = Math.floor(time / 24);

	let str = '';
	days && (str += days + ' days ');
	hours && (str += hours + 'h ');
	min && (str += min + 'm ');
	(sec || !str.length) && (str += sec + 's');
	return str;
}

Api.apps.getByID(+route.params.id).then((a) => {
	app.value = a;
	window.document.title = a.name + ' audience | Crash Course';
});

function loadAudience() {
	today.value &&
		Api.apps
			.getRealtimeAudience(+route.params.id)
			.then((a) => (realtimeAudience.value = a))
			.catch((err) => alert('Failed to load the app', PopupColor.Red, err.message));
	Api.apps
		.getDayAudience(+route.params.id, startTime.value.getTime())
		.then((a) => (todayAudience.value = a));
}

loadAudience();

const refreshInterval = setInterval(() => today.value && loadAudience(), 1000 * 10);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped>
.row .card {
	flex-basis: 350px;
}

.row .sessions {
	flex-basis: 800px;
}

.today-audience {
	display: flex;
	flex-flow: row wrap;
	gap: 2em;
}

.audience-section {
	min-width: 40%;
}

.session {
	border: 1px solid var(--color-shadow);
	padding: 8px;
	border-radius: 8px;
}
</style>
