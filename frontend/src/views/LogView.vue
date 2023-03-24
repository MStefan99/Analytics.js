<template lang="pug">
#logs
	h1 {{app?.name}} {{$route.params.type === 'client' ? 'client' : 'server'}} logs
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-input") Starting from
			DatePicker#date-input.w-full(type="date" v-model="startTime" @change="loadLogs()")
		.input
			label(for="level-input") Minimum level
			DropdownSelect#level-input.w-full(:options="levels" v-model="level" @change="loadLogs()")
	table.cells.w-full
		thead
			tr
				th Level
				th Tag
				th Time
				th Message
		tbody
			tr.log-row(:class="'log-' + log.level" v-for="log in logs" :key="log.time")
				td.log-level(:class="'log-' + log.level") {{levels[log.level]}}
				td {{log.tag}}
				td {{new Date(log.time).toLocaleString()}}
				td.code {{log.message}}
			tr(v-if="!logs.length")
				td.text-center(colspan="4") No logs found matching your criteria
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {onUnmounted, ref} from 'vue';
import type {App, Log} from '../scripts/types';
import DropdownSelect from '../components/DropdownSelect.vue';
import DatePicker from '../components/DatePicker.vue';
import {alert, PopupColor} from '../scripts/popups';
import Api from '../scripts/api';

const route = useRoute();
const app = ref<App | null>(null);
const logs = ref<Log[]>([]);
const dayLength = 1000 * 60 * 60 * 24;
const initialDate = new Date(Date.now() - dayLength);
const levels = ['Debug', 'Information', 'Warning', 'Error', 'Critical'];

const startTime = ref<Date>(initialDate);
const level = ref<number>(1);

window.document.title = 'Logs | Crash Course';

Api.apps
	.getByID(+route.params.id)
	.then((a) => (app.value = a))
	.catch((err) => alert('Failed to load logs', PopupColor.Red, err.message));

function loadLogs() {
	Api.apps
		.getLogs(
			+route.params.id,
			route.params.type === 'client' ? 'client' : 'server',
			startTime.value.getTime(),
			level.value
		)
		.then((l) => (logs.value = l));
}

loadLogs();
onUnmounted(() => clearInterval(setInterval(loadLogs, 1000 * 30)));
</script>

<style scoped></style>
