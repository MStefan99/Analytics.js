<template lang="pug">
#apps
	h1 Your apps
	#apps-container
		RouterLink.app.block.card.mb-4(
			v-for="app in apps"
			:key="app.id"
			:to="{name: 'status', params: {id: app.id}}")
			.mb-4
				h2 {{app.name}}
				p {{app.description}}
			TimedChart(
				v-if="hasPermissions([PERMISSIONS.VIEW_AUDIENCE], app.permissions) && dataset[app.id]"
				:data="dataset[app.id]"
				:y-stacked="false"
				:step-size="dayLength"
				overview)
	div(v-if="apps.length")
		button(@click="newApp = emptyApp") Add an app
	div(v-else)
		h2 No apps yet
		p Add an app to start
		button.mt-4(@click="newApp = emptyApp") Add an app
	Transition(name="popup")
		.popup-wrapper(v-if="newApp" @click.self="newApp = null")
			.popup
				h2.popup-title New app
				form.popup-content(@submit.prevent="addApp")
					.mb-3
						label(for="name-input") Name
						input#name-input.w-full(type="text" placeholder="Name" v-model="newApp.name")
					.mb-3
						label(for="description-input") Description
						input#description-input.w-full(
							type="text"
							placeholder="Description"
							v-model="newApp.description")
					.mb-3
						button.w-full(type="submit") Add an app
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import type {AppWithAudience, NewApp} from '../scripts/types';
import Api from '../scripts/api';
import {useRouter} from 'vue-router';
import {alert, PopupColor} from '../scripts/popups';
import TimedChart from '../components/TimedChart.vue';
import {hasPermissions, PERMISSIONS} from '../../../common/permissions';

const apps = ref<AppWithAudience[]>([]);
const newApp = ref<NewApp | null>(null);
const dataset = computed(() =>
	Object.fromEntries(
		apps.value.map((app) => [
			app.id,
			[
				{
					label: app.name + ' users',
					color: '#ef8105',
					data: app.audience?.users
				},
				{
					label: app.name + ' views',
					color: '#44c40c',
					data: app.audience?.views
				}
			]
		])
	)
);
const emptyApp: NewApp = {name: '', description: ''};
const router = useRouter();
const dayLength = 1000 * 60 * 60 * 24;

window.document.title = 'Apps | Crash Course';

Api.apps
	.getAll(true)
	.then((a) => {
		apps.value = a;
	})
	.catch((err) => alert('Failed to load apps', PopupColor.Red, err.message));

function addApp() {
	Api.apps
		.add(newApp.value)
		.then((a) => {
			router.replace({name: 'settings', params: {id: a.id}});
		})
		.catch((err) => alert('Failed to save the app', PopupColor.Red, err.message));
}
</script>

<style scoped>
#apps-container {
	@apply md:flex flex-wrap gap-x-4 justify-between max-w-max;
}

.app {
	@apply flex flex-col flex-nowrap justify-between grow;
}

.card {
	flex-basis: 300px;
}

:deep(.chart) {
	@apply h-24 mb-0;
}
</style>
