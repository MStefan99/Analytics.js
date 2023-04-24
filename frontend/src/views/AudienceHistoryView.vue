<template lang="pug">
#audience(v-if="app")
	h1 {{app.name}} audience
	.row
		.card.m-4
			h2 Audience history
			TimedChart(:data="audienceAggregate" :yStacked="false" :step-size="1000 * 60 * 60 * 24")
		.card.m-4
			h2 Traffic history
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
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute} from 'vue-router';

import Api from '../scripts/api';
import type {App, AudienceAggregate, PageAggregate} from '../scripts/types';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';

const route = useRoute();
const app = ref<App | null>(null);
const historicalAudience = ref<AudienceAggregate | null>(null);
const pages = ref<PageAggregate | null>(null);

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

Api.apps
	.getByID(+route.params.id)
	.then((a) => {
		app.value = a;
		window.document.title = a.name + ' audience | Crash Course';
	})
	.catch((err) => alert('Failed to load the app', PopupColor.Red, err.message));
Api.apps.getAudienceAggregate(+route.params.id).then((a) => (historicalAudience.value = a));
Api.apps.getPageAggregate(+route.params.id).then((p) => (pages.value = p));
</script>

<style scoped>
.row .card {
	flex-basis: 400px;
}
</style>
