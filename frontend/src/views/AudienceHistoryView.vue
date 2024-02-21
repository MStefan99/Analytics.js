<template lang="pug">
#audience(v-if="app")
	h1 {{app.name}} audience
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-start") Starting from
			DatePicker#date-start.w-full(v-model="start" @change="load()")
		.input
			label(for="level-end") Ending on
			DatePicker#date-end.w-full(v-model="end" @change="load()")
	.row
		.card
			h2 Audience history
			TimedChart(:data="audienceAggregate" :yStacked="false" @click="(time) => openDayView(time)")
		.card
			h2 Traffic history
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
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';

import Api from '../scripts/api';
import type {App, AudienceAggregate, PageAggregate} from '../scripts/types';
import DatePicker from '../components/DatePicker.vue';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';
import {useQuery} from '../scripts/composables';

const router = useRouter();
const route = useRoute();
const app = ref<App | null>(null);
const historicalAudience = ref<AudienceAggregate | null>(null);
const pages = ref<PageAggregate | null>(null);
const monthLength = 1000 * 60 * 60 * 24 * 30;
const initialTime = new Date(Date.now() - monthLength);
const start = ref<Date>(initialTime);
const end = ref<Date>(new Date());

const {query} = useQuery(
	computed(() => ({
		start: start.value.toISOString(),
		end: end.value.toISOString()
	}))
);
start.value = new Date(Array.isArray(query.value.start) ? query.value.start[0] : query.value.start);
end.value = new Date(Array.isArray(query.value.end) ? query.value.end[0] : query.value.end);

const audienceAggregate = computed(() => [
	{
		label: 'Users',
		color: '#ef8105',
		data: historicalAudience.value?.users
	},
	{
		label: 'Page views',
		color: '#44c40c',
		data: historicalAudience.value?.views
	}
]);

Api.apps.getByID(+route.params.id).then((a) => {
	app.value = a;
	window.document.title = a.name + ' audience | Crash Course';
});

function load() {
	Api.apps
		.getAudienceAggregate(+route.params.id, start.value.getTime(), end.value.getTime())
		.then((a) => (historicalAudience.value = a))
		.catch((err) => alert('Failed to load the app', PopupColor.Red, err.message));
	Api.apps
		.getPageAggregate(+route.params.id, start.value.getTime(), end.value.getTime())
		.then((p) => (pages.value = p));
}

load();

function openDayView(time: number) {
	router.push({name: 'audience-day', query: {start: new Date(time).toISOString()}});
}
</script>

<style scoped>
.row > .card {
	flex-basis: 400px;
}
</style>
