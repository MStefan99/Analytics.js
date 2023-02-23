<template lang="pug">
Bar(:data="chartData" :options="options")
</template>

<script setup lang="ts">
//@ts-ignore
import {Bar} from 'vue-chartjs';

import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	CategoryScale,
	LinearScale
	//@ts-ignore
} from 'chart.js';
import {computed, ref} from 'vue';

const props = defineProps<{
	data: {label: string; color: string; data: {[key: string]: number}}[] | undefined;
	color?: string;
}>();
const sessionLength = 60 * 1000;

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const options = ref({
	responsive: true,
	scales: {
		x: {stacked: true, ticks: {color: props.color ?? '#000000'}},
		y: {stacked: true, ticks: {color: props.color ?? '#000000'}}
	},
	plugins: {legend: {labels: {color: props.color ?? '#000000'}}}
});
const labels: string[] = [];
for (let i = 0; i <= 30; ++i) {
	labels.push(30 - i + ' min');
}

const chartData = computed(() => {
	const datasets: {label: string; backgroundColor: string; data: number[]}[] = [];
	const startTime = Date.now() - (Date.now() % sessionLength) - sessionLength * 30;

	for (const series of props.data) {
		const dataset = {label: series.label, backgroundColor: series.color, data: [] as number[]};

		for (let i = 0; i <= 30; ++i) {
			dataset.data[i] = series.data?.[startTime + sessionLength * i] ?? 0;
		}

		datasets.push(dataset);
	}

	return {
		labels,
		datasets
	};
});
</script>

<style scoped></style>
