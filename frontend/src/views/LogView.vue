<template lang="pug">
#logs
	h1 {{app?.name}} {{$route.params.type === 'client' ? 'client' : 'server'}} logs
	div(v-if="historicalLogs")
		TimedChart(:data="chartData" :step-size="1000 * 60 * 60 * 24")
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
			tr.log-row(:class="'log-' + log.level" v-for="log in logs" :key="log.id")
				td.log-level(:class="'log-' + log.level") {{levels[log.level]}}
				td {{log.tag}}
				td {{new Date(log.time).toLocaleString()}}
				td.code {{log.message}}
			tr(v-if="!logs.length")
				td.text-center(colspan="4") No logs found matching your criteria
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {computed, onUnmounted, ref} from 'vue';
import type {App, HistoricalLogs, Log} from '../scripts/types';
import DropdownSelect from '../components/DropdownSelect.vue';
import DatePicker from '../components/DatePicker.vue';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';
import Api from '../scripts/api';

const route = useRoute();
const app = ref<App | null>(null);
const logs = ref<Log[]>([]);
const historicalLogs = ref<HistoricalLogs | null>(null);
const dayLength = 1000 * 60 * 60 * 24;
const initialDate = new Date(Date.now() - dayLength);
const levels = ['Debug', 'Information', 'Warning', 'Error', 'Critical'];

const startTime = ref<Date>(initialDate);
const level = ref<number>(1);

const colors = {
	debug: '#4f46e5',
	info: '#059669',
	warning: '#ca8a04',
	error: '#ea580c',
	critical: '#e11d48'
};

const chartData = computed(() => [
	{
		label: 'Debug logs',
		color: colors.debug,
		data:
			route.params.type === 'server'
				? historicalLogs.value.serverLogs['0']
				: historicalLogs.value.clientLogs['0']
	},
	{
		label: 'Info logs',
		color: colors.info,
		data:
			route.params.type === 'server'
				? historicalLogs.value.serverLogs['1']
				: historicalLogs.value.clientLogs['1']
	},
	{
		label: 'Warnings',
		color: colors.warning,
		data:
			route.params.type === 'server'
				? historicalLogs.value.serverLogs['2']
				: historicalLogs.value.clientLogs['2']
	},
	{
		label: 'Errors',
		color: colors.error,
		data:
			route.params.type === 'server'
				? historicalLogs.value.serverLogs['3']
				: historicalLogs.value.clientLogs['3']
	},
	{
		label: 'Critical',
		color: colors.critical,
		data:
			route.params.type === 'server'
				? historicalLogs.value.serverLogs['4']
				: historicalLogs.value.clientLogs['4']
	}
]);

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
	Api.apps.getHistoricalLogs(+route.params.id).then((l) => (historicalLogs.value = l));
}

loadLogs();

const refreshInterval = setInterval(loadLogs, 1000 * 15);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped></style>
